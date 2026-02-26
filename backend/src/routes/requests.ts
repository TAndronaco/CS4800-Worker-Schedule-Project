import { Router, Response } from 'express';
import pool from '../config/db';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/requests - Create a swap or time-off request
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, shift_id, target_shift_id, reason } = req.body;

    const result = await pool.query(
      'INSERT INTO shift_requests (type, requester_id, shift_id, target_shift_id, reason) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [type, req.user!.userId, shift_id, target_shift_id || null, reason || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/requests?team_id=X - Get requests for a team
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { team_id } = req.query;

    const result = await pool.query(
      `SELECT sr.*, u.first_name, u.last_name
       FROM shift_requests sr
       JOIN users u ON sr.requester_id = u.id
       JOIN shifts s ON sr.shift_id = s.id
       WHERE s.team_id = $1
       ORDER BY sr.created_at DESC`,
      [team_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/requests/:id - Approve or deny a request (manager only)
router.patch('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;

    if (!['approved', 'denied'].includes(status)) {
      res.status(400).json({ error: 'Status must be "approved" or "denied".' });
      return;
    }

    const result = await pool.query(
      'UPDATE shift_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
