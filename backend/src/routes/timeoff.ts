import { Router, Response } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { timeOffService } from '../services/timeOffService';
import { getSingleValue } from '../utils/getSingleValue';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// POST /api/time-off - Create a time-off request
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await timeOffService.create(req.body, req.user!.userId);
    res.status(201).json(request);
  } catch (error) {
    handleRouteError(res, error, 'Create time-off error:', 'Server error.');
  }
});

// GET /api/time-off?team_id=X - Get time-off requests (manager sees team, employee sees own)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;

    if (req.user!.role === 'manager' && teamId) {
      const requests = await timeOffService.getForTeam(teamId);
      res.json(requests);
    } else {
      const requests = await timeOffService.getForUser(req.user!.userId);
      res.json(requests);
    }
  } catch (error) {
    handleRouteError(res, error, 'Get time-off error:', 'Server error.');
  }
});

// PATCH /api/time-off/:id - Approve or deny (manager only)
router.patch('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await timeOffService.updateStatus(getSingleValue(req.params.id) || '', req.body.status, req.user!.userId);
    res.json(result);
  } catch (error) {
    handleRouteError(res, error, 'Update time-off error:', 'Server error.');
  }
});

// DELETE /api/time-off/:id - Cancel own pending request
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await timeOffService.deleteRequest(getSingleValue(req.params.id) || '', req.user!.userId);
    res.json({ message: 'Request cancelled.' });
  } catch (error) {
    handleRouteError(res, error, 'Delete time-off error:', 'Server error.');
  }
});

export default router;
