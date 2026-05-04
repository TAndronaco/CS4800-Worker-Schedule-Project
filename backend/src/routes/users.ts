import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { userService } from '../services/userService';
import { getSingleValue } from '../utils/getSingleValue';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// GET /api/users/me - Get current user's profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = await userService.getProfile(req.user!.userId);
    res.json(profile);
  } catch (error) {
    handleRouteError(res, error, 'Get profile error:', 'Server error');
  }
});

// PUT /api/users/me - Update current user's profile
router.put('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = await userService.updateProfile(req.user!.userId, req.body);
    res.json(profile);
  } catch (error) {
    handleRouteError(res, error, 'Update profile error:', 'Server error');
  }
});

// PUT /api/users/me/password - Change password
router.put('/me/password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await userService.changePassword(req.user!.userId, req.body);
    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    handleRouteError(res, error, 'Change password error:', 'Server error');
  }
});

// GET /api/users/me/notification-preferences
router.get('/me/notification-preferences', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const prefs = await userService.getNotificationPreferences(req.user!.userId);
    res.json(prefs);
  } catch (error) {
    handleRouteError(res, error, 'Get notification prefs error:', 'Server error');
  }
});

// PUT /api/users/me/notification-preferences
router.put('/me/notification-preferences', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const prefs = await userService.updateNotificationPreferences(req.user!.userId, req.body);
    res.json(prefs);
  } catch (error) {
    handleRouteError(res, error, 'Update notification prefs error:', 'Server error');
  }
});

// GET /api/users/:id/avatar
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

// PUT /api/users/:id/avatar
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

// DELETE /api/users/:id/avatar
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
