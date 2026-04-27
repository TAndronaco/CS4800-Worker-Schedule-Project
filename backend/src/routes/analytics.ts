import { Router, Response } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { analyticsService } from '../services/analyticsService';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// GET /api/analytics?team_id=X&week=YYYY-MM-DD
router.get('/', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;
    const week = typeof req.query.week === 'string' ? req.query.week : undefined;

    if (!teamId || !week) {
      res.status(400).json({ error: 'team_id and week are required.' });
      return;
    }

    const analytics = await analyticsService.getTeamAnalytics(teamId, week);
    res.json(analytics);
  } catch (error) {
    handleRouteError(res, error, 'Analytics error:', 'Server error.');
  }
});

export default router;
