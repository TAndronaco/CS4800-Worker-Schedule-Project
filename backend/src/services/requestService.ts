import pool from '../config/db';
import { HttpError } from '../errors/HttpError';
import { notificationService } from './notificationService';

type RequestType = 'swap' | 'time_off';
type RequestStatus = 'pending' | 'approved' | 'denied';
type SwapStatus = 'pending' | 'accepted' | 'rejected';

interface CreateShiftRequestInput {
  type: RequestType;
  shift_id: number | string;
  target_shift_id?: number | string | null;
  target_employee_id?: number | string | null;
  reason?: string | null;
}

interface ShiftRequest {
  id: number;
  type: RequestType;
  requester_id: number;
  shift_id: number;
  target_shift_id: number | null;
  target_employee_id: number | null;
  status: RequestStatus;
  swap_status: SwapStatus;
  reason: string | null;
  created_at: string;
}

interface ShiftRequestListItem extends ShiftRequest {
  first_name: string;
  last_name: string;
  target_first_name?: string;
  target_last_name?: string;
  shift_date?: string;
  shift_start_time?: string;
  shift_end_time?: string;
  target_shift_date?: string;
  target_shift_start_time?: string;
  target_shift_end_time?: string;
}

class RequestService {
  async createRequest(input: CreateShiftRequestInput, requesterId: number): Promise<ShiftRequest> {
    const { type, shift_id, target_shift_id, target_employee_id, reason } = input;

    if (type === 'swap' && (!target_shift_id || !target_employee_id)) {
      throw new HttpError(400, 'Swap requests require target_shift_id and target_employee_id.');
    }

    const result = await pool.query<ShiftRequest>(
      `INSERT INTO shift_requests (type, requester_id, shift_id, target_shift_id, target_employee_id, reason, swap_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        type,
        requesterId,
        shift_id,
        target_shift_id || null,
        target_employee_id || null,
        reason || null,
        type === 'swap' ? 'pending' : 'pending',
      ]
    );

    // Notify target employee of incoming swap request
    if (type === 'swap' && target_employee_id) {
      const requester = await pool.query<{ first_name: string; last_name: string }>(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [requesterId]
      );
      const name = requester.rows[0]
        ? `${requester.rows[0].first_name} ${requester.rows[0].last_name}`
        : 'A coworker';
      notificationService.create(
        Number(target_employee_id),
        'swap_proposed',
        `${name} wants to swap shifts with you.`,
        result.rows[0].id
      ).catch(() => {});
    }

    return result.rows[0];
  }

  async getRequests(teamId?: string): Promise<ShiftRequestListItem[]> {
    if (!teamId) {
      return [];
    }

    const result = await pool.query<ShiftRequestListItem>(
      `SELECT sr.*,
              u.first_name, u.last_name,
              tu.first_name AS target_first_name, tu.last_name AS target_last_name,
              s.date AS shift_date, s.start_time AS shift_start_time, s.end_time AS shift_end_time,
              ts.date AS target_shift_date, ts.start_time AS target_shift_start_time, ts.end_time AS target_shift_end_time
       FROM shift_requests sr
       JOIN users u ON sr.requester_id = u.id
       JOIN shifts s ON sr.shift_id = s.id
       LEFT JOIN users tu ON sr.target_employee_id = tu.id
       LEFT JOIN shifts ts ON sr.target_shift_id = ts.id
       WHERE s.team_id = $1
       ORDER BY sr.created_at DESC`,
      [teamId]
    );

    return result.rows;
  }

  async respondToSwap(requestId: string, userId: number, accept: boolean): Promise<ShiftRequest> {
    // Verify the user is the target employee
    const req = await pool.query<ShiftRequest>(
      'SELECT * FROM shift_requests WHERE id = $1',
      [requestId]
    );

    if (req.rows.length === 0) {
      throw new HttpError(404, 'Request not found.');
    }

    const request = req.rows[0];

    if (request.type !== 'swap') {
      throw new HttpError(400, 'This is not a swap request.');
    }

    if (request.target_employee_id !== userId) {
      throw new HttpError(403, 'You are not the target employee for this swap.');
    }

    if (request.swap_status !== 'pending') {
      throw new HttpError(400, 'This swap has already been responded to.');
    }

    const newSwapStatus: SwapStatus = accept ? 'accepted' : 'rejected';

    // If rejected, also deny the overall request
    const newStatus = accept ? request.status : 'denied';

    const result = await pool.query<ShiftRequest>(
      'UPDATE shift_requests SET swap_status = $1, status = $2 WHERE id = $3 RETURNING *',
      [newSwapStatus, newStatus, requestId]
    );

    // Notify the requester about the swap response
    const responder = await pool.query<{ first_name: string; last_name: string }>(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    const responderName = responder.rows[0]
      ? `${responder.rows[0].first_name} ${responder.rows[0].last_name}`
      : 'Your coworker';
    const action = accept ? 'accepted' : 'declined';
    notificationService.create(
      request.requester_id,
      accept ? 'swap_accepted' : 'swap_rejected',
      `${responderName} ${action} your shift swap request.`,
      request.id
    ).catch(() => {});

    return result.rows[0];
  }

  async updateStatus(requestId: string, status: string): Promise<ShiftRequest> {
    if (!['approved', 'denied'].includes(status)) {
      throw new HttpError(400, 'Status must be "approved" or "denied".');
    }

    const req = await pool.query<ShiftRequest>(
      'SELECT * FROM shift_requests WHERE id = $1',
      [requestId]
    );

    if (req.rows.length === 0) {
      throw new HttpError(404, 'Request not found.');
    }

    const request = req.rows[0];

    // For swap requests, ensure target employee has accepted before manager can approve
    if (request.type === 'swap' && status === 'approved' && request.swap_status !== 'accepted') {
      throw new HttpError(400, 'Cannot approve swap until the target employee accepts.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update request status
      const result = await client.query<ShiftRequest>(
        'UPDATE shift_requests SET status = $1 WHERE id = $2 RETURNING *',
        [status, requestId]
      );

      // If approving a swap, actually swap the employee_ids on the two shifts
      if (request.type === 'swap' && status === 'approved' && request.target_shift_id) {
        const shift1 = await client.query<{ employee_id: number }>(
          'SELECT employee_id FROM shifts WHERE id = $1',
          [request.shift_id]
        );
        const shift2 = await client.query<{ employee_id: number }>(
          'SELECT employee_id FROM shifts WHERE id = $1',
          [request.target_shift_id]
        );

        if (shift1.rows.length > 0 && shift2.rows.length > 0) {
          await client.query(
            'UPDATE shifts SET employee_id = $1 WHERE id = $2',
            [shift2.rows[0].employee_id, request.shift_id]
          );
          await client.query(
            'UPDATE shifts SET employee_id = $1 WHERE id = $2',
            [shift1.rows[0].employee_id, request.target_shift_id]
          );
        }
      }

      await client.query('COMMIT');

      // Notify requester about the decision
      const typeLabel = request.type === 'swap' ? 'shift swap' : 'time off';
      notificationService.create(
        request.requester_id,
        status === 'approved' ? 'request_approved' : 'request_denied',
        `Your ${typeLabel} request was ${status}.`,
        request.id
      ).catch(() => {});

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const requestService = new RequestService();
