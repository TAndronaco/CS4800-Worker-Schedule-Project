import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { payrollService } from '../services/payrollService';
import { handleRouteError } from '../utils/handleRouteError';
import { getSingleValue } from '../utils/getSingleValue';

const router = Router();

// GET /api/payroll/team-rates - Get team members with hourly rates (manager only)
router.get('/team-rates', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = getSingleValue(req.query.team_id as string | string[] | undefined);
    if (!teamId) {
      res.status(400).json({ error: 'team_id is required' });
      return;
    }

    const rates = await payrollService.getTeamRates(parseInt(teamId), req.user!.userId);
    res.json(rates);
  } catch (error) {
    handleRouteError(res, error, 'Get team rates error:', 'Server error');
  }
});

// PUT /api/payroll/set-rate - Set employee hourly rate (manager only)
router.put('/set-rate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employee_id, hourly_rate } = req.body;

    if (!employee_id || hourly_rate === undefined) {
      res.status(400).json({ error: 'employee_id and hourly_rate are required' });
      return;
    }

    const result = await payrollService.setEmployeeRate(
      parseInt(employee_id),
      req.user!.userId,
      parseFloat(hourly_rate)
    );
    res.json(result);
  } catch (error) {
    handleRouteError(res, error, 'Set hourly rate error:', 'Server error');
  }
});

// GET /api/payroll/earnings - Get employee earnings summary (employee only)
router.get('/earnings', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const earnings = await payrollService.getEmployeeEarnings(req.user!.userId);
    res.json(earnings);
  } catch (error) {
    handleRouteError(res, error, 'Get earnings error:', 'Server error');
  }
});

// GET /api/payroll/daily-earnings - Get daily earnings breakdown (employee only)
router.get('/daily-earnings', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const timeframe = (req.query.timeframe as string) || 'month';

    if (!['day', 'week', 'month'].includes(timeframe)) {
      res.status(400).json({ error: 'timeframe must be day, week, or month' });
      return;
    }

    const daily = await payrollService.getDailyEarnings(
      req.user!.userId,
      timeframe as 'day' | 'week' | 'month'
    );
    res.json(daily);
  } catch (error) {
    handleRouteError(res, error, 'Get daily earnings error:', 'Server error');
  }
});

export default router;
