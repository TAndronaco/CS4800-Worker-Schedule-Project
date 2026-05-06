import { Router, Response } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { reportService } from '../services/reportService';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// GET /api/reports/weekly?team_id=X&week=YYYY-MM-DD
router.get('/weekly', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;
    const week = typeof req.query.week === 'string' ? req.query.week : undefined;
    if (!teamId || !week) {
      res.status(400).json({ error: 'team_id and week are required.' });
      return;
    }
    const report = await reportService.getWeeklySummary(teamId, week);
    res.json(report);
  } catch (error) {
    handleRouteError(res, error, 'Weekly report error:', 'Server error.');
  }
});

export default router;
