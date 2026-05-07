import pool from '../config/db';
import { notificationService } from './notificationService';
import { activityService } from './activityService';

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
  role?: string;
}

interface ShiftFilters {
  team_id?: string;
  week?: string;
  employee_id?: string;
}

interface ShiftConflict {
  employee_id: number;
  date: string;
  reason: string;
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

    // Notify employee of new shift assignment
    notificationService.create(
      Number(employee_id),
      'shift_assigned',
      `You've been assigned a shift on ${date} (${start_time}–${end_time}).`,
      insertResult.rows[0].id
    ).catch(() => {}); // fire-and-forget

    activityService.log({
      team_id,
      user_id: Number(employee_id),
      type: 'shift_assigned',
      message: `Shift assigned on ${date} (${start_time}-${end_time}).`,
      related_id: insertResult.rows[0].id,
    }).catch(() => {});

    return insertResult.rows[0];
  }

  async getShifts(filters: ShiftFilters): Promise<Shift[]> {
    const { team_id, week, employee_id } = filters;
    let query =
      'SELECT s.*, u.first_name, u.last_name, u.role FROM shifts s JOIN users u ON s.employee_id = u.id WHERE 1=1';
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

  async getConflicts(teamId: string, week: string): Promise<ShiftConflict[]> {
    const conflicts: ShiftConflict[] = [];

    const shiftsResult = await pool.query<{
      employee_id: number;
      date: string;
      start_time: string;
      end_time: string;
      day_of_week: number;
      team_id: number;
    }>(
      `SELECT s.*, ((EXTRACT(DOW FROM s.date)::int + 6) % 7) AS day_of_week
       FROM shifts s
       WHERE s.team_id = $1
         AND s.date >= $2::date
         AND s.date < $2::date + interval '7 days'`,
      [teamId, week]
    );

    for (const shift of shiftsResult.rows) {
      const date = shift.date.split('T')[0];

      const sameDayShift = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS(
          SELECT 1 FROM shifts
          WHERE employee_id = $1 AND date = $2::date
          AND NOT (team_id = $3 AND start_time = $4::time AND end_time = $5::time)
        )`,
        [shift.employee_id, date, shift.team_id, shift.start_time, shift.end_time]
      );
      if (sameDayShift.rows[0]?.exists) {
        conflicts.push({ employee_id: shift.employee_id, date, reason: 'has_another_shift_same_day' });
      }

      const pto = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS(
          SELECT 1 FROM time_off_requests
          WHERE user_id = $1 AND status = 'approved'
            AND $2::date BETWEEN start_date AND end_date
        )`,
        [shift.employee_id, date]
      );
      if (pto.rows[0]?.exists) {
        conflicts.push({ employee_id: shift.employee_id, date, reason: 'approved_time_off_overlap' });
      }

      const availability = await pool.query<{ covered: boolean }>(
        `SELECT EXISTS(
          SELECT 1 FROM availability
          WHERE user_id = $1
            AND team_id = $2
            AND day_of_week = $3
            AND start_time <= $4::time
            AND end_time >= $5::time
        ) AS covered`,
        [shift.employee_id, teamId, shift.day_of_week, shift.start_time, shift.end_time]
      );
      if (!availability.rows[0]?.covered) {
        conflicts.push({ employee_id: shift.employee_id, date, reason: 'outside_availability' });
      }
    }

    return conflicts;
  }
}

export const shiftService = new ShiftService();
