import { Router, Response } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { performanceService } from '../services/performanceService';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// GET /api/performance/me?team_id=X - Get own metrics (employee)
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;
    if (!teamId) {
      res.status(400).json({ error: 'team_id is required.' });
      return;
    }
    const metrics = await performanceService.getEmployeeMetrics(req.user!.userId, teamId);
    res.json(metrics);
  } catch (error) {
    handleRouteError(res, error, 'Get metrics error:', 'Server error.');
  }
});

// GET /api/performance/team?team_id=X - Get all employee metrics (manager)
router.get('/team', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;
    if (!teamId) {
      res.status(400).json({ error: 'team_id is required.' });
      return;
    }
    const metrics = await performanceService.getTeamMetrics(teamId);
    res.json(metrics);
  } catch (error) {
    handleRouteError(res, error, 'Get team metrics error:', 'Server error.');
  }
});

// GET /api/performance/reports?employee_id=X&team_id=X
router.get('/reports', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = typeof req.query.employee_id === 'string' ? Number(req.query.employee_id) : req.user!.userId;
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;
    const reports = await performanceService.getReportsForEmployee(employeeId, teamId);
    res.json(reports);
  } catch (error) {
    handleRouteError(res, error, 'Get reports error:', 'Server error.');
  }
});

// GET /api/performance/reports/team?team_id=X (manager)
router.get('/reports/team', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;
    if (!teamId) {
      res.status(400).json({ error: 'team_id is required.' });
      return;
    }
    const reports = await performanceService.getReportsForTeam(teamId);
    res.json(reports);
  } catch (error) {
    handleRouteError(res, error, 'Get team reports error:', 'Server error.');
  }
});

// POST /api/performance/reports - Create a report (manager)
router.post('/reports', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = await performanceService.createReport(req.user!.userId, req.body);
    res.status(201).json(report);
  } catch (error) {
    handleRouteError(res, error, 'Create report error:', 'Server error.');
  }
});

export default router;
