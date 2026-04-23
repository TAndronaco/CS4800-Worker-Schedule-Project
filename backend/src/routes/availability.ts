import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { availabilityService } from '../services/availabilityService';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// GET /api/availability?team_id=X - Get availability (manager gets all, employee gets own)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;
    if (!teamId) {
      res.status(400).json({ error: 'team_id is required.' });
      return;
    }

    if (req.user!.role === 'manager') {
      const availability = await availabilityService.getTeamAvailability(teamId);
      res.json(availability);
    } else {
      const availability = await availabilityService.getAvailability(req.user!.userId, teamId);
      res.json(availability);
    }
  } catch (error) {
    handleRouteError(res, error, 'Get availability error:', 'Server error.');
  }
});

// PUT /api/availability - Set availability for current user
router.put('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { team_id, slots } = req.body;
    if (!team_id || !Array.isArray(slots)) {
      res.status(400).json({ error: 'team_id and slots array are required.' });
      return;
    }

    const result = await availabilityService.setAvailability(req.user!.userId, team_id, slots);
    res.json(result);
  } catch (error) {
    handleRouteError(res, error, 'Set availability error:', 'Server error.');
  }
});

export default router;
