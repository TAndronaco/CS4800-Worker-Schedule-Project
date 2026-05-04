import { Router, Response } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { requestService } from '../services/requestService';
import { getSingleValue } from '../utils/getSingleValue';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// POST /api/requests - Create a swap or time-off request
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await requestService.createRequest(req.body, req.user!.userId);
    res.status(201).json(request);
  } catch (error) {
    handleRouteError(res, error, 'Create request error:', 'Server error.');
  }
});

// GET /api/requests?team_id=X - Get requests for a team
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requests = await requestService.getRequests(
      typeof req.query.team_id === 'string' ? req.query.team_id : undefined
    );
    res.json(requests);
  } catch (error) {
    handleRouteError(res, error, 'Get requests error:', 'Server error.');
  }
});

// PATCH /api/requests/:id/swap-respond - Target employee accepts/rejects a swap
router.patch('/:id/swap-respond', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requestId = getSingleValue(req.params.id);
    if (!requestId) {
      res.status(400).json({ error: 'Request id is required.' });
      return;
    }

    const { accept } = req.body;
    if (typeof accept !== 'boolean') {
      res.status(400).json({ error: 'accept must be a boolean.' });
      return;
    }

    const request = await requestService.respondToSwap(requestId, req.user!.userId, accept);
    res.json(request);
  } catch (error) {
    handleRouteError(res, error, 'Swap respond error:', 'Server error.');
  }
});

// PATCH /api/requests/:id - Approve or deny a request (manager only)
router.patch('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requestId = getSingleValue(req.params.id);
    if (!requestId) {
      res.status(400).json({ error: 'Request id is required.' });
      return;
    }

    const request = await requestService.updateStatus(requestId, req.body.status);
    res.json(request);
  } catch (error) {
    handleRouteError(res, error, 'Update request error:', 'Server error.');
  }
});

export default router;
