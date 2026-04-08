import { Router, Request, Response } from 'express';
import pool from '../config/db';

const router = Router();

// GET /api/users/:id/avatar — get user's avatar URL
router.get('/:id/avatar', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ avatar_url: result.rows[0].avatar_url });
  } catch (error) {
    console.error('Get avatar error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id/avatar — upload avatar (base64)
router.put('/:id/avatar', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { avatar_url } = req.body;

    if (!avatar_url) {
      res.status(400).json({ error: 'avatar_url is required' });
      return;
    }

    const result = await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, avatar_url',
      [avatar_url, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id/avatar — remove avatar
router.delete('/:id/avatar', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE users SET avatar_url = NULL WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
