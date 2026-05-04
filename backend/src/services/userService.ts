import bcrypt from 'bcryptjs';
import pool from '../config/db';
import { HttpError } from '../errors/HttpError';

interface AvatarRecord {
  id?: number;
  avatar_url: string | null;
}

interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url: string | null;
}

interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

interface NotificationPreferences {
  shift_assigned: boolean;
  swap_proposed: boolean;
  swap_accepted: boolean;
  swap_rejected: boolean;
  request_approved: boolean;
  request_denied: boolean;
  time_off_update: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  shift_assigned: true,
  swap_proposed: true,
  swap_accepted: true,
  swap_rejected: true,
  request_approved: true,
  request_denied: true,
  time_off_update: true,
};

class UserService {
  async getProfile(userId: number): Promise<UserProfile> {
    const result = await pool.query<UserProfile>(
      'SELECT id, email, first_name, last_name, role, avatar_url FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      throw new HttpError(404, 'User not found');
    }
    return result.rows[0];
  }

  async updateProfile(userId: number, input: UpdateProfileInput): Promise<UserProfile> {
    const { first_name, last_name, email } = input;

    if (email) {
      const existing = await pool.query<{ id: number }>(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      if (existing.rows.length > 0) {
        throw new HttpError(400, 'Email already in use.');
      }
    }

    const result = await pool.query<UserProfile>(
      `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email)
      WHERE id = $4
      RETURNING id, email, first_name, last_name, role, avatar_url`,
      [first_name || null, last_name || null, email || null, userId]
    );

    if (result.rows.length === 0) {
      throw new HttpError(404, 'User not found');
    }

    return result.rows[0];
  }

  async changePassword(userId: number, input: ChangePasswordInput): Promise<void> {
    const { current_password, new_password } = input;

    if (!new_password || new_password.length < 6) {
      throw new HttpError(400, 'New password must be at least 6 characters.');
    }

    const user = await pool.query<{ password: string }>(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );
    if (user.rows.length === 0) {
      throw new HttpError(404, 'User not found');
    }

    const isMatch = await bcrypt.compare(current_password, user.rows[0].password);
    if (!isMatch) {
      throw new HttpError(400, 'Current password is incorrect.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(new_password, salt);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, userId]);
  }

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

  async getNotificationPreferences(userId: number): Promise<NotificationPreferences> {
    const result = await pool.query<{ preferences: NotificationPreferences }>(
      'SELECT preferences FROM notification_preferences WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return { ...DEFAULT_PREFERENCES };
    }
    return { ...DEFAULT_PREFERENCES, ...result.rows[0].preferences };
  }

  async updateNotificationPreferences(userId: number, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const current = await this.getNotificationPreferences(userId);
    const merged = { ...current, ...prefs };

    await pool.query(
      `INSERT INTO notification_preferences (user_id, preferences)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET preferences = $2, updated_at = NOW()`,
      [userId, JSON.stringify(merged)]
    );

    return merged;
  }

  async shouldNotify(userId: number, type: string): Promise<boolean> {
    const prefs = await this.getNotificationPreferences(userId);
    const key = type as keyof NotificationPreferences;
    if (key in prefs) {
      return prefs[key];
    }
    return true;
  }
}

export const userService = new UserService();
