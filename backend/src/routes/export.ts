import { Router, Response } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { shiftService } from '../services/shiftService';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// GET /api/export/schedule?team_id=X&week=YYYY-MM-DD
router.get('/schedule', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;
    const week = typeof req.query.week === 'string' ? req.query.week : undefined;

    if (!teamId || !week) {
      res.status(400).json({ error: 'team_id and week are required.' });
      return;
    }

    const shifts = await shiftService.getShifts({ team_id: teamId, week });

    const header = 'Employee,Date,Start Time,End Time,Hours\n';
    const rows = shifts.map((s) => {
      const [startH, startM] = (s.start_time || '').split(':').map(Number);
      const [endH, endM] = (s.end_time || '').split(':').map(Number);
      const hours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
      const name = `${s.first_name || ''} ${s.last_name || ''}`.trim();
      const date = typeof s.date === 'string' ? s.date.split('T')[0] : s.date;
      return `"${name}","${date}","${s.start_time}","${s.end_time}","${hours.toFixed(1)}"`;
    });

    const csv = header + rows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="schedule-${week}.csv"`);
    res.send(csv);
  } catch (error) {
    handleRouteError(res, error, 'Export schedule error:', 'Server error.');
  }
});

export default router;
