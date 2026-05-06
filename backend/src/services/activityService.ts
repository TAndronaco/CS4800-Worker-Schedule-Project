import pool from '../config/db';

interface ActivityLogInput {
  team_id: number | string;
  user_id: number;
  type: string;
  message: string;
  related_id?: number | string | null;
}

interface ActivityLogRow {
  id: number;
  team_id: number;
  user_id: number;
  type: string;
  message: string;
  related_id: number | null;
  created_at: string;
}

class ActivityService {
  async log(input: ActivityLogInput): Promise<void> {
    const { team_id, user_id, type, message, related_id } = input;
    await pool.query(
      `INSERT INTO activity_log (team_id, user_id, type, message, related_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [team_id, user_id, type, message, related_id ?? null]
    );
  }

  async getRecentForUser(userId: number, limit = 10): Promise<ActivityLogRow[]> {
    const result = await pool.query<ActivityLogRow>(
      `SELECT a.*
       FROM activity_log a
       JOIN team_members tm ON tm.team_id = a.team_id
       WHERE tm.user_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }
}

export const activityService = new ActivityService();
