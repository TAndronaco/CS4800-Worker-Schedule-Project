import { Router, Response } from 'express';
import crypto from 'crypto';
import pool from '../config/db';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/teams - Create a new team (manager only)
router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const joinCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const result = await pool.query(
      'INSERT INTO teams (name, join_code, manager_id) VALUES ($1, $2, $3) RETURNING *',
      [name, joinCode, req.user!.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/teams/join - Join a team via code (employee)
router.post('/join', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { join_code } = req.body;

    const team = await pool.query('SELECT * FROM teams WHERE join_code = $1', [join_code]);
    if (team.rows.length === 0) {
      res.status(404).json({ error: 'Invalid join code.' });
      return;
    }

    await pool.query(
      'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [team.rows[0].id, req.user!.userId]
    );

    res.json({ message: 'Joined team successfully.', team: team.rows[0] });
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/teams/:id/members - Get members of a team
router.get('/:id/members', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email
       FROM users u
       JOIN team_members tm ON u.id = tm.user_id
       WHERE tm.team_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/teams - Get user's teams
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT t.* FROM teams t
       LEFT JOIN team_members tm ON t.id = tm.team_id
       WHERE t.manager_id = $1 OR tm.user_id = $1`,
      [req.user!.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
