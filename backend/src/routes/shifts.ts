import { Router, Response } from 'express';
import pool from '../config/db';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/shifts - Create or update a shift (manager only)
router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { team_id, employee_id, date, start_time, end_time } = req.body;

    // Use UPSERT logic: If a shift exists for this employee on this date in this team, update it.
    // We need a unique constraint or manual check. Since we might not have a unique constraint on (team_id, employee_id, date), 
    // we'll check and then either update or insert.
    
    const existing = await pool.query(
      'SELECT id FROM shifts WHERE team_id = $1 AND employee_id = $2 AND date = $3',
      [team_id, employee_id, date]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing shift
      result = await pool.query(
        'UPDATE shifts SET start_time = $1, end_time = $2 WHERE id = $3 RETURNING *',
        [start_time, end_time, existing.rows[0].id]
      );
    } else {
      // Insert new shift
      result = await pool.query(
        'INSERT INTO shifts (team_id, employee_id, date, start_time, end_time) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [team_id, employee_id, date, start_time, end_time]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create/Update shift error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/shifts?team_id=X&week=YYYY-MM-DD - Get shifts for a team/week
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { team_id, week, employee_id } = req.query;

    let query = 'SELECT s.*, u.first_name, u.last_name FROM shifts s JOIN users u ON s.employee_id = u.id WHERE 1=1';
    const params: any[] = [];

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

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/shifts/bulk - Delete all shifts for a team/week (manager only)
router.delete('/bulk', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { team_id, week } = req.query;

    if (!team_id || !week) {
      res.status(400).json({ error: 'team_id and week are required.' });
      return;
    }

    await pool.query(
      "DELETE FROM shifts WHERE team_id = $1 AND date >= $2::date AND date < $2::date + interval '7 days'",
      [team_id, week]
    );

    res.json({ message: 'Schedule cleared.' });
  } catch (error) {
    console.error('Bulk delete shifts error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/shifts/:id - Delete a shift (manager only)
router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await pool.query('DELETE FROM shifts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Shift deleted.' });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
