import pool from '../config/db';
import { HttpError } from '../errors/HttpError';

type RequestType = 'swap' | 'time_off';
type RequestStatus = 'pending' | 'approved' | 'denied';

interface CreateShiftRequestInput {
  type: RequestType;
  shift_id: number | string;
  target_shift_id?: number | string | null;
  reason?: string | null;
}

interface ShiftRequest {
  id: number;
  type: RequestType;
  requester_id: number;
  shift_id: number;
  target_shift_id: number | null;
  status: RequestStatus;
  reason: string | null;
  created_at: string;
}

interface ShiftRequestListItem extends ShiftRequest {
  first_name: string;
  last_name: string;
}

class RequestService {
  async createRequest(input: CreateShiftRequestInput, requesterId: number): Promise<ShiftRequest> {
    const { type, shift_id, target_shift_id, reason } = input;

    const result = await pool.query<ShiftRequest>(
      'INSERT INTO shift_requests (type, requester_id, shift_id, target_shift_id, reason) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [type, requesterId, shift_id, target_shift_id || null, reason || null]
    );

    return result.rows[0];
  }

  async getRequests(teamId?: string): Promise<ShiftRequestListItem[]> {
    if (!teamId) {
      return [];
    }

    const result = await pool.query<ShiftRequestListItem>(
      `SELECT sr.*, u.first_name, u.last_name
       FROM shift_requests sr
       JOIN users u ON sr.requester_id = u.id
       JOIN shifts s ON sr.shift_id = s.id
       WHERE s.team_id = $1
       ORDER BY sr.created_at DESC`,
      [teamId]
    );

    return result.rows;
  }

  async updateStatus(requestId: string, status: string): Promise<ShiftRequest> {
    if (!['approved', 'denied'].includes(status)) {
      throw new HttpError(400, 'Status must be "approved" or "denied".');
    }

    const result = await pool.query<ShiftRequest>(
      'UPDATE shift_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, requestId]
    );

    if (result.rows.length === 0) {
      throw new HttpError(404, 'Request not found.');
    }

    return result.rows[0];
  }
}

export const requestService = new RequestService();
