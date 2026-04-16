import { Router, Request, Response } from 'express';
import { userService } from '../services/userService';
import { getSingleValue } from '../utils/getSingleValue';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// GET /api/users/:id/avatar — get user's avatar URL
router.get('/:id/avatar', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getSingleValue(req.params.id);
    if (!userId) {
      res.status(400).json({ error: 'User id is required' });
      return;
    }

    const avatar = await userService.getAvatar(userId);
    res.json(avatar);
  } catch (error) {
    handleRouteError(res, error, 'Get avatar error:', 'Server error');
  }
});

// PUT /api/users/:id/avatar — upload avatar (base64)
router.put('/:id/avatar', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getSingleValue(req.params.id);
    if (!userId) {
      res.status(400).json({ error: 'User id is required' });
      return;
    }

    const updatedAvatar = await userService.updateAvatar(userId, req.body.avatar_url);
    res.json(updatedAvatar);
  } catch (error) {
    handleRouteError(res, error, 'Upload avatar error:', 'Server error');
  }
});

// DELETE /api/users/:id/avatar — remove avatar
router.delete('/:id/avatar', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getSingleValue(req.params.id);
    if (!userId) {
      res.status(400).json({ error: 'User id is required' });
      return;
    }

    const result = await userService.deleteAvatar(userId);
    res.json(result);
  } catch (error) {
    handleRouteError(res, error, 'Delete avatar error:', 'Server error');
  }
});

export default router;
