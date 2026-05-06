import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { activityService } from '../services/activityService';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// GET /api/activity?limit=10
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 10;
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, limit)) : 10;
    const events = await activityService.getRecentForUser(req.user!.userId, safeLimit);
    res.json(events);
  } catch (error) {
    handleRouteError(res, error, 'Get activity error:', 'Server error.');
  }
});

export default router;
