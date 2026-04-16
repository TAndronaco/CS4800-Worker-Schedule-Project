import pool from '../config/db';
import { HttpError } from '../errors/HttpError';

interface AvatarRecord {
  id?: number;
  avatar_url: string | null;
}

class UserService {
  async getAvatar(userId: string): Promise<{ avatar_url: string | null }> {
    const result = await pool.query<AvatarRecord>('SELECT avatar_url FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      throw new HttpError(404, 'User not found');
    }

    return { avatar_url: result.rows[0].avatar_url };
  }

  async updateAvatar(userId: string, avatarUrl?: string): Promise<{ id: number; avatar_url: string | null }> {
    if (!avatarUrl) {
      throw new HttpError(400, 'avatar_url is required');
    }

    const result = await pool.query<{ id: number; avatar_url: string | null }>(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, avatar_url',
      [avatarUrl, userId]
    );

    if (result.rows.length === 0) {
      throw new HttpError(404, 'User not found');
    }

    return result.rows[0];
  }

  async deleteAvatar(userId: string): Promise<{ success: boolean }> {
    await pool.query('UPDATE users SET avatar_url = NULL WHERE id = $1', [userId]);
    return { success: true };
  }
}

export const userService = new UserService();
