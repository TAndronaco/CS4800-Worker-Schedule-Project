import pool from '../config/db';

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AvailabilityRow {
  id: number;
  user_id: number;
  team_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  first_name?: string;
  last_name?: string;
}

class AvailabilityService {
  async getAvailability(userId: number, teamId: string): Promise<AvailabilityRow[]> {
    const result = await pool.query<AvailabilityRow>(
      'SELECT * FROM availability WHERE user_id = $1 AND team_id = $2 ORDER BY day_of_week, start_time',
      [userId, teamId]
    );
    return result.rows;
  }

  async getTeamAvailability(teamId: string): Promise<AvailabilityRow[]> {
    const result = await pool.query<AvailabilityRow>(
      `SELECT a.*, u.first_name, u.last_name
       FROM availability a
       JOIN users u ON a.user_id = u.id
       WHERE a.team_id = $1
       ORDER BY a.user_id, a.day_of_week, a.start_time`,
      [teamId]
    );
    return result.rows;
  }

  async setAvailability(userId: number, teamId: number | string, slots: AvailabilitySlot[]): Promise<AvailabilityRow[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM availability WHERE user_id = $1 AND team_id = $2', [userId, teamId]);

      const inserted: AvailabilityRow[] = [];
      for (const slot of slots) {
        const result = await client.query<AvailabilityRow>(
          'INSERT INTO availability (user_id, team_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [userId, teamId, slot.day_of_week, slot.start_time, slot.end_time]
        );
        inserted.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return inserted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const availabilityService = new AvailabilityService();
