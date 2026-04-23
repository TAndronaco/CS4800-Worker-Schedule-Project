import pool from '../config/db';

interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  read: boolean;
  related_id: number | null;
  created_at: string;
}

class NotificationService {
  async create(userId: number, type: string, message: string, relatedId?: number): Promise<Notification> {
    const result = await pool.query<Notification>(
      'INSERT INTO notifications (user_id, type, message, related_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, type, message, relatedId || null]
    );
    return result.rows[0];
  }

  async getAll(userId: number): Promise<Notification[]> {
    const result = await pool.query<Notification>(
      `SELECT * FROM notifications
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    return result.rows;
  }

  async getUnread(userId: number): Promise<Notification[]> {
    const result = await pool.query<Notification>(
      'SELECT * FROM notifications WHERE user_id = $1 AND read = false ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async getUnreadCount(userId: number): Promise<number> {
    const result = await pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  async markRead(notificationId: string, userId: number): Promise<Notification | null> {
    const result = await pool.query<Notification>(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );
    return result.rows[0] || null;
  }

  async markAllRead(userId: number): Promise<void> {
    await pool.query(
      'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
      [userId]
    );
  }
}

export const notificationService = new NotificationService();
