import pool from '../config/db';
import { HttpError } from '../errors/HttpError';

interface ConversationRow {
  id: number;
  type: string;
  name: string | null;
  created_by: number | null;
  team_id: number | null;
  created_at: string;
  last_message?: string;
  last_message_at?: string;
  last_sender_name?: string;
  member_names?: string;
  unread_count?: number;
}

interface MessageRow {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  first_name: string;
  last_name: string;
}

interface MemberRow {
  user_id: number;
  first_name: string;
  last_name: string;
  role: string;
}

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
}

class MessageService {
  async getContacts(currentUserId: string): Promise<Contact[]> {
    const result = await pool.query<Contact>(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.role
       FROM users u
       JOIN team_members tm ON u.id = tm.user_id
       WHERE tm.team_id IN (
         SELECT team_id FROM team_members WHERE user_id = $1
         UNION
         SELECT id FROM teams WHERE manager_id = $1
       )
       AND u.id != $1
       ORDER BY u.first_name, u.last_name`,
      [currentUserId]
    );
    return result.rows;
  }

  async getConversations(userId: number): Promise<ConversationRow[]> {
    const result = await pool.query<ConversationRow>(
      `SELECT c.id, c.type, c.name, c.created_by, c.team_id, c.created_at,
              lm.content AS last_message,
              lm.created_at AS last_message_at,
              CONCAT(lu.first_name, ' ', lu.last_name) AS last_sender_name,
              (SELECT STRING_AGG(CONCAT(u2.first_name, ' ', u2.last_name), ', ' ORDER BY u2.first_name)
               FROM conversation_members cm2
               JOIN users u2 ON cm2.user_id = u2.id
               WHERE cm2.conversation_id = c.id AND cm2.user_id != $1
              ) AS member_names
       FROM conversations c
       JOIN conversation_members cm ON c.id = cm.conversation_id
       LEFT JOIN LATERAL (
         SELECT m.content, m.created_at, m.sender_id
         FROM messages m WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC LIMIT 1
       ) lm ON true
       LEFT JOIN users lu ON lm.sender_id = lu.id
       WHERE cm.user_id = $1
       ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
      [userId]
    );
    return result.rows;
  }

  async getOrCreateDm(userId: number, otherUserId: number): Promise<number> {
    // Check for existing DM between these two users
    const existing = await pool.query<{ id: number }>(
      `SELECT c.id FROM conversations c
       JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = $1
       JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = $2
       WHERE c.type = 'dm'
       AND (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.id) = 2
       LIMIT 1`,
      [userId, otherUserId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const conv = await client.query<{ id: number }>(
        `INSERT INTO conversations (type, created_by) VALUES ('dm', $1) RETURNING id`,
        [userId]
      );
      const convId = conv.rows[0].id;
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [convId, userId, otherUserId]
      );
      await client.query('COMMIT');
      return convId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createGroupChat(creatorId: number, name: string, memberIds: number[], teamId?: number): Promise<ConversationRow> {
    if (!name || name.trim().length === 0) {
      throw new HttpError(400, 'Group name is required.');
    }
    if (memberIds.length < 1) {
      throw new HttpError(400, 'At least one other member is required.');
    }

    const allMembers = [creatorId, ...memberIds.filter((id) => id !== creatorId)];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const conv = await client.query<ConversationRow>(
        `INSERT INTO conversations (type, name, created_by, team_id)
         VALUES ('group', $1, $2, $3) RETURNING *`,
        [name.trim(), creatorId, teamId || null]
      );
      const convId = conv.rows[0].id;

      const placeholders = allMembers.map((_, i) => `($1, $${i + 2})`).join(', ');
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id) VALUES ${placeholders}`,
        [convId, ...allMembers]
      );

      await client.query('COMMIT');
      return conv.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getMessages(conversationId: number, userId: number): Promise<MessageRow[]> {
    // Verify user is a member
    const membership = await pool.query(
      `SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    if (membership.rows.length === 0) {
      throw new HttpError(403, 'You are not a member of this conversation.');
    }

    const result = await pool.query<MessageRow>(
      `SELECT m.*, u.first_name, u.last_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId]
    );
    return result.rows;
  }

  async sendMessage(conversationId: number, senderId: number, content: string): Promise<MessageRow> {
    if (!content || content.trim().length === 0) {
      throw new HttpError(400, 'Message content is required.');
    }

    // Verify sender is a member
    const membership = await pool.query(
      `SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, senderId]
    );
    if (membership.rows.length === 0) {
      throw new HttpError(403, 'You are not a member of this conversation.');
    }

    const result = await pool.query<MessageRow>(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [conversationId, senderId, content.trim()]
    );

    // Attach sender name
    const user = await pool.query<{ first_name: string; last_name: string }>(
      `SELECT first_name, last_name FROM users WHERE id = $1`,
      [senderId]
    );
    return {
      ...result.rows[0],
      first_name: user.rows[0]?.first_name || '',
      last_name: user.rows[0]?.last_name || '',
    };
  }

  async getConversationMembers(conversationId: number): Promise<MemberRow[]> {
    const result = await pool.query<MemberRow>(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.role
       FROM conversation_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.conversation_id = $1
       ORDER BY u.first_name`,
      [conversationId]
    );
    return result.rows;
  }

  // Legacy compatibility: DM via sender/receiver IDs
  async sendDirectMessage(senderId: number, receiverId: number, content: string): Promise<MessageRow> {
    const convId = await this.getOrCreateDm(senderId, receiverId);
    return this.sendMessage(convId, senderId, content);
  }

  async getDirectMessages(userId: number, otherUserId: number): Promise<MessageRow[]> {
    const convId = await this.getOrCreateDm(userId, otherUserId);
    return this.getMessages(convId, userId);
  }
}

export const messageService = new MessageService();
