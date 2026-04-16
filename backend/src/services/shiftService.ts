import pool from '../config/db';

interface ShiftInput {
  team_id: number | string;
  employee_id: number | string;
  date: string;
  start_time: string;
  end_time: string;
}

interface Shift {
  id: number;
  team_id: number;
  employee_id: number;
  date: string;
  start_time: string;
  end_time: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

interface ShiftFilters {
  team_id?: string;
  week?: string;
  employee_id?: string;
}

class ShiftService {
  async createOrUpdateShift(input: ShiftInput): Promise<Shift> {
    const { team_id, employee_id, date, start_time, end_time } = input;

    const existing = await pool.query<{ id: number }>(
      'SELECT id FROM shifts WHERE team_id = $1 AND employee_id = $2 AND date = $3',
      [team_id, employee_id, date]
    );

    if (existing.rows.length > 0) {
      const updateResult = await pool.query<Shift>(
        'UPDATE shifts SET start_time = $1, end_time = $2 WHERE id = $3 RETURNING *',
        [start_time, end_time, existing.rows[0].id]
      );
      return updateResult.rows[0];
    }

    const insertResult = await pool.query<Shift>(
      'INSERT INTO shifts (team_id, employee_id, date, start_time, end_time) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [team_id, employee_id, date, start_time, end_time]
    );

    return insertResult.rows[0];
  }

  async getShifts(filters: ShiftFilters): Promise<Shift[]> {
    const { team_id, week, employee_id } = filters;
    let query =
      'SELECT s.*, u.first_name, u.last_name FROM shifts s JOIN users u ON s.employee_id = u.id WHERE 1=1';
    const params: Array<string> = [];

    if (team_id) {
      params.push(team_id);
      query += ` AND s.team_id = $${params.length}`;
    }

    if (employee_id) {
      params.push(employee_id);
      query += ` AND s.employee_id = $${params.length}`;
    }

    if (week) {
      params.push(week);
      query += ` AND s.date >= $${params.length}::date AND s.date < $${params.length}::date + interval '7 days'`;
    }

    query += ' ORDER BY s.date, s.start_time';

    const result = await pool.query<Shift>(query, params);
    return result.rows;
  }

  async deleteShiftsForWeek(teamId: string, week: string): Promise<void> {
    await pool.query(
      "DELETE FROM shifts WHERE team_id = $1 AND date >= $2::date AND date < $2::date + interval '7 days'",
      [teamId, week]
    );
  }

  async deleteShift(shiftId: string): Promise<void> {
    await pool.query('DELETE FROM shifts WHERE id = $1', [shiftId]);
  }
}

export const shiftService = new ShiftService();
