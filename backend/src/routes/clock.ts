import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { clockService } from '../services/clockService';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// GET /api/clock/status?team_id=X
router.get('/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;
    if (!teamId) {
      res.status(400).json({ error: 'team_id is required.' });
      return;
    }
    const status = await clockService.getStatus(req.user!.userId, teamId);
    res.json(status);
  } catch (error) {
    handleRouteError(res, error, 'Clock status error:', 'Server error.');
  }
});

// POST /api/clock/in
router.post('/in', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { team_id } = req.body;
    if (!team_id) {
      res.status(400).json({ error: 'team_id is required.' });
      return;
    }
    const entry = await clockService.clockIn(req.user!.userId, team_id);
    res.status(201).json(entry);
  } catch (error) {
    handleRouteError(res, error, 'Clock in error:', 'Server error.');
  }
});

// POST /api/clock/out
router.post('/out', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { team_id } = req.body;
    if (!team_id) {
      res.status(400).json({ error: 'team_id is required.' });
      return;
    }
    const entry = await clockService.clockOut(req.user!.userId, team_id);
    res.json(entry);
  } catch (error) {
    handleRouteError(res, error, 'Clock out error:', 'Server error.');
  }
});

// GET /api/clock/history?team_id=X
router.get('/history', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;
    if (!teamId) {
      res.status(400).json({ error: 'team_id is required.' });
      return;
    }
    const history = await clockService.getHistory(req.user!.userId, teamId);
    res.json(history);
  } catch (error) {
    handleRouteError(res, error, 'Clock history error:', 'Server error.');
  }
});

// GET /api/clock/team?team_id=X&start=YYYY-MM-DD&end=YYYY-MM-DD (manager view)
router.get('/team', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;
    const start = typeof req.query.start === 'string' ? req.query.start : undefined;
    const end = typeof req.query.end === 'string' ? req.query.end : undefined;
    if (!teamId || !start || !end) {
      res.status(400).json({ error: 'team_id, start, and end are required.' });
      return;
    }
    const history = await clockService.getTeamHistory(teamId, start, end);
    res.json(history);
  } catch (error) {
    handleRouteError(res, error, 'Team clock history error:', 'Server error.');
  }
});

export default router;
