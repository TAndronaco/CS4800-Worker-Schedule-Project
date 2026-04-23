import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { getSingleValue } from '../utils/getSingleValue';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// GET /api/notifications - Get current user's notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = typeof req.query.filter === 'string' ? req.query.filter : 'all';
    let notifications;
    if (filter === 'unread') {
      notifications = await notificationService.getUnread(req.user!.userId);
    } else {
      notifications = await notificationService.getAll(req.user!.userId);
    }
    res.json(notifications);
  } catch (error) {
    handleRouteError(res, error, 'Get notifications error:', 'Server error.');
  }
});

// GET /api/notifications/unread-count - Quick count for badge
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.userId);
    res.json({ count });
  } catch (error) {
    handleRouteError(res, error, 'Get unread count error:', 'Server error.');
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await notificationService.markAllRead(req.user!.userId);
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    handleRouteError(res, error, 'Mark all read error:', 'Server error.');
  }
});

// PATCH /api/notifications/:id/read - Mark single as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notificationId = getSingleValue(req.params.id);
    if (!notificationId) {
      res.status(400).json({ error: 'Notification id is required.' });
      return;
    }

    const notification = await notificationService.markRead(notificationId, req.user!.userId);
    if (!notification) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    res.json(notification);
  } catch (error) {
    handleRouteError(res, error, 'Mark read error:', 'Server error.');
  }
});

export default router;
