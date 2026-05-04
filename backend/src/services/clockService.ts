import pool from '../config/db';
import { HttpError } from '../errors/HttpError';

interface ClockEntry {
  id: number;
  user_id: number;
  shift_id: number | null;
  team_id: number;
  clock_in: string;
  clock_out: string | null;
  created_at: string;
}

interface ClockStatus {
  clocked_in: boolean;
  entry: ClockEntry | null;
}

class ClockService {
  async getStatus(userId: number, teamId: string): Promise<ClockStatus> {
    const result = await pool.query<ClockEntry>(
      `SELECT * FROM clock_entries
       WHERE user_id = $1 AND team_id = $2 AND clock_out IS NULL
       ORDER BY clock_in DESC LIMIT 1`,
      [userId, teamId]
    );
    if (result.rows.length > 0) {
      return { clocked_in: true, entry: result.rows[0] };
    }
    return { clocked_in: false, entry: null };
  }

  async clockIn(userId: number, teamId: number): Promise<ClockEntry> {
    const existing = await pool.query<ClockEntry>(
      'SELECT * FROM clock_entries WHERE user_id = $1 AND team_id = $2 AND clock_out IS NULL',
      [userId, teamId]
    );
    if (existing.rows.length > 0) {
      throw new HttpError(400, 'Already clocked in.');
    }

    // Find if there's a shift today for this employee
    const today = new Date().toISOString().split('T')[0];
    const shift = await pool.query<{ id: number }>(
      'SELECT id FROM shifts WHERE employee_id = $1 AND team_id = $2 AND date = $3 LIMIT 1',
      [userId, teamId, today]
    );

    const shiftId = shift.rows.length > 0 ? shift.rows[0].id : null;

    const result = await pool.query<ClockEntry>(
      `INSERT INTO clock_entries (user_id, team_id, shift_id, clock_in)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [userId, teamId, shiftId]
    );
    return result.rows[0];
  }

  async clockOut(userId: number, teamId: number): Promise<ClockEntry> {
    const existing = await pool.query<ClockEntry>(
      'SELECT * FROM clock_entries WHERE user_id = $1 AND team_id = $2 AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1',
      [userId, teamId]
    );
    if (existing.rows.length === 0) {
      throw new HttpError(400, 'Not currently clocked in.');
    }

    const result = await pool.query<ClockEntry>(
      'UPDATE clock_entries SET clock_out = NOW() WHERE id = $1 RETURNING *',
      [existing.rows[0].id]
    );
    return result.rows[0];
  }

  async getHistory(userId: number, teamId: string, limit = 30): Promise<ClockEntry[]> {
    const result = await pool.query<ClockEntry>(
      `SELECT * FROM clock_entries
       WHERE user_id = $1 AND team_id = $2
       ORDER BY clock_in DESC LIMIT $3`,
      [userId, teamId, limit]
    );
    return result.rows;
  }

  async getTeamHistory(teamId: string, startDate: string, endDate: string): Promise<(ClockEntry & { first_name: string; last_name: string })[]> {
    const result = await pool.query<ClockEntry & { first_name: string; last_name: string }>(
      `SELECT ce.*, u.first_name, u.last_name
       FROM clock_entries ce
       JOIN users u ON ce.user_id = u.id
       WHERE ce.team_id = $1 AND ce.clock_in >= $2::date AND ce.clock_in < $3::date + interval '1 day'
       ORDER BY ce.clock_in DESC`,
      [teamId, startDate, endDate]
    );
    return result.rows;
  }
}

export const clockService = new ClockService();
