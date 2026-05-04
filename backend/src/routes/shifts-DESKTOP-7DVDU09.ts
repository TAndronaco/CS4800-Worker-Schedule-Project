import { Router, Response } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { shiftService } from '../services/shiftService';
import { getSingleValue } from '../utils/getSingleValue';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// POST /api/shifts - Create or update a shift (manager only)
router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shift = await shiftService.createOrUpdateShift(req.body);
    res.status(201).json(shift);
  } catch (error) {
    handleRouteError(res, error, 'Create/Update shift error:', 'Server error.');
  }
});

// GET /api/shifts?team_id=X&week=YYYY-MM-DD - Get shifts for a team/week
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shifts = await shiftService.getShifts({
      team_id: typeof req.query.team_id === 'string' ? req.query.team_id : undefined,
      week: typeof req.query.week === 'string' ? req.query.week : undefined,
      employee_id: typeof req.query.employee_id === 'string' ? req.query.employee_id : undefined,
    });
    res.json(shifts);
  } catch (error) {
    handleRouteError(res, error, 'Get shifts error:', 'Server error.');
  }
});

// DELETE /api/shifts/bulk - Delete all shifts for a team/week (manager only)
router.delete('/bulk', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;
    const week = typeof req.query.week === 'string' ? req.query.week : undefined;

    if (!teamId || !week) {
      res.status(400).json({ error: 'team_id and week are required.' });
      return;
    }

    await shiftService.deleteShiftsForWeek(teamId, week);

    res.json({ message: 'Schedule cleared.' });
  } catch (error) {
    handleRouteError(res, error, 'Bulk delete shifts error:', 'Server error.');
  }
});

// DELETE /api/shifts/:id - Delete a shift (manager only)
router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shiftId = getSingleValue(req.params.id);
    if (!shiftId) {
      res.status(400).json({ error: 'Shift id is required.' });
      return;
    }

    await shiftService.deleteShift(shiftId);
    res.json({ message: 'Shift deleted.' });
  } catch (error) {
    handleRouteError(res, error, 'Delete shift error:', 'Server error.');
  }
});

export default router;
