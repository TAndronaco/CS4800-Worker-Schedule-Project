import { Router, Response } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { shiftService } from '../services/shiftService';
import { availabilityService } from '../services/availabilityService';
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

// POST /api/shifts/auto-generate - Generate schedule based on availability (manager only)
router.post('/auto-generate', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { team_id, week, cover_start, cover_end, active_days, employee_ids } = req.body;

    if (!team_id || !week) {
      res.status(400).json({ error: 'team_id and week are required.' });
      return;
    }

    const startHour = cover_start ?? 9;
    const endHour = cover_end ?? 17;
    const days: boolean[] = active_days ?? [true, true, true, true, true, false, false];

    const availability = await availabilityService.getTeamAvailability(String(team_id));

    const mondayDate = new Date(week + 'T00:00:00');
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mondayDate);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    const allowedEmployees = employee_ids ? new Set(employee_ids.map(Number)) : null;

    interface ProposedShift {
      employee_id: number;
      date: string;
      start_time: string;
      end_time: string;
    }

    const proposed: ProposedShift[] = [];
    let globalRobin = 0;

    for (let di = 0; di < 7; di++) {
      if (!days[di]) continue;
      const date = weekDays[di];
      const dayHours: Record<number, number> = {};

      // Find employees available on this day within the coverage window
      const availableOnDay = availability.filter((a) => {
        if (a.day_of_week !== di) return false;
        if (allowedEmployees && !allowedEmployees.has(a.user_id)) return false;
        const aStart = parseInt(a.start_time.split(':')[0], 10);
        const aEnd = parseInt(a.end_time.split(':')[0], 10);
        return aEnd > startHour && aStart < endHour;
      });

      const uniqueEmployees = [...new Set(availableOnDay.map((a) => a.user_id))];
      uniqueEmployees.forEach((id) => (dayHours[id] = 0));

      if (uniqueEmployees.length === 0) continue;

      const windowSize = endHour - startHour;

      if (windowSize <= 8) {
        let assigned = 0;
        for (let attempt = 0; attempt < uniqueEmployees.length && assigned < Math.min(2, uniqueEmployees.length); attempt++) {
          const empId = uniqueEmployees[(globalRobin + attempt) % uniqueEmployees.length];
          if ((dayHours[empId] || 0) + windowSize <= 8) {
            proposed.push({
              employee_id: empId,
              date,
              start_time: `${String(startHour).padStart(2, '0')}:00`,
              end_time: `${String(endHour).padStart(2, '0')}:00`,
            });
            dayHours[empId] = (dayHours[empId] || 0) + windowSize;
            assigned++;
          }
        }
        globalRobin = (globalRobin + 2) % Math.max(uniqueEmployees.length, 1);
      } else {
        let cursor = startHour;
        let segIndex = 0;
        while (cursor < endHour) {
          const segEnd = Math.min(cursor + 8, endHour);
          const segLen = segEnd - cursor;
          let assigned = 0;
          const baseIdx = (globalRobin + segIndex * 2) % Math.max(uniqueEmployees.length, 1);
          for (let attempt = 0; attempt < uniqueEmployees.length && assigned < Math.min(2, uniqueEmployees.length); attempt++) {
            const empId = uniqueEmployees[(baseIdx + attempt) % uniqueEmployees.length];
            if ((dayHours[empId] || 0) + segLen <= 8) {
              proposed.push({
                employee_id: empId,
                date,
                start_time: `${String(cursor).padStart(2, '0')}:00`,
                end_time: `${String(segEnd).padStart(2, '0')}:00`,
              });
              dayHours[empId] = (dayHours[empId] || 0) + segLen;
              assigned++;
            }
          }
          cursor = segEnd;
          segIndex++;
        }
        globalRobin = (globalRobin + 2) % Math.max(uniqueEmployees.length, 1);
      }
    }

    res.json(proposed);
  } catch (error) {
    handleRouteError(res, error, 'Auto-generate error:', 'Server error.');
  }
});

export default router;
