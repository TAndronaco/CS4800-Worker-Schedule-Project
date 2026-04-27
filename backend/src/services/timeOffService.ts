import pool from '../config/db';
import { HttpError } from '../errors/HttpError';
import { notificationService } from './notificationService';

interface TimeOffRow {
  id: number;
  user_id: number;
  team_id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  reviewed_by: number | null;
  created_at: string;
  first_name?: string;
  last_name?: string;
  reviewer_first_name?: string;
  reviewer_last_name?: string;
}

interface CreateTimeOffInput {
  team_id: number | string;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

class TimeOffService {
  async create(input: CreateTimeOffInput, userId: number): Promise<TimeOffRow> {
    const { team_id, start_date, end_date, reason } = input;

    if (new Date(end_date) < new Date(start_date)) {
      throw new HttpError(400, 'End date must be on or after start date.');
    }

    const result = await pool.query<TimeOffRow>(
      `INSERT INTO time_off_requests (user_id, team_id, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, team_id, start_date, end_date, reason || null]
    );

    return result.rows[0];
  }

  async getForTeam(teamId: string): Promise<TimeOffRow[]> {
    const result = await pool.query<TimeOffRow>(
      `SELECT t.*, u.first_name, u.last_name,
              r.first_name AS reviewer_first_name, r.last_name AS reviewer_last_name
       FROM time_off_requests t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN users r ON t.reviewed_by = r.id
       WHERE t.team_id = $1
       ORDER BY t.created_at DESC`,
      [teamId]
    );
    return result.rows;
  }

  async getForUser(userId: number): Promise<TimeOffRow[]> {
    const result = await pool.query<TimeOffRow>(
      `SELECT t.*, u.first_name, u.last_name
       FROM time_off_requests t
       JOIN users u ON t.user_id = u.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async updateStatus(requestId: string, status: string, reviewerId: number): Promise<TimeOffRow> {
    if (!['approved', 'denied'].includes(status)) {
      throw new HttpError(400, 'Status must be "approved" or "denied".');
    }

    const existing = await pool.query<TimeOffRow>(
      'SELECT * FROM time_off_requests WHERE id = $1',
      [requestId]
    );

    if (existing.rows.length === 0) {
      throw new HttpError(404, 'Time-off request not found.');
    }

    const result = await pool.query<TimeOffRow>(
      'UPDATE time_off_requests SET status = $1, reviewed_by = $2 WHERE id = $3 RETURNING *',
      [status, reviewerId, requestId]
    );

    notificationService.create(
      existing.rows[0].user_id,
      status === 'approved' ? 'pto_approved' : 'pto_denied',
      `Your time-off request (${existing.rows[0].start_date} to ${existing.rows[0].end_date}) was ${status}.`,
      result.rows[0].id
    ).catch(() => {});

    return result.rows[0];
  }

  async deleteRequest(requestId: string, userId: number): Promise<void> {
    const existing = await pool.query<TimeOffRow>(
      'SELECT * FROM time_off_requests WHERE id = $1',
      [requestId]
    );

    if (existing.rows.length === 0) {
      throw new HttpError(404, 'Time-off request not found.');
    }

    if (existing.rows[0].user_id !== userId) {
      throw new HttpError(403, 'You can only cancel your own requests.');
    }

    if (existing.rows[0].status !== 'pending') {
      throw new HttpError(400, 'Can only cancel pending requests.');
    }

    await pool.query('DELETE FROM time_off_requests WHERE id = $1', [requestId]);
  }
}

export const timeOffService = new TimeOffService();
