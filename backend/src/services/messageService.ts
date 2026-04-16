import pool from '../config/db';

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

interface SendMessageInput {
  receiver_id: number | string;
  sender_id: number | string;
  content: string;
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
       AND u.id != $1`,
      [currentUserId]
    );

    return result.rows;
  }

  async getConversation(currentUserId: string, otherUserId: string): Promise<Message[]> {
    const result = await pool.query<Message>(
      `SELECT m.*, u.first_name, u.last_name 
       FROM messages m 
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
       OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [currentUserId, otherUserId]
    );

    return result.rows;
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    const { receiver_id, content, sender_id } = input;
    const result = await pool.query<Message>(
      `INSERT INTO messages (sender_id, receiver_id, content) 
       VALUES ($1, $2, $3) RETURNING *`,
      [sender_id, receiver_id, content]
    );
    return result.rows[0];
  }
}

export const messageService = new MessageService();
