import { Router, Response } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { teamService } from '../services/teamService';
import { getSingleValue } from '../utils/getSingleValue';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// POST /api/teams - Create a new team (manager only)
router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const team = await teamService.createTeam(req.body.name, req.user!.userId);
    res.status(201).json(team);
  } catch (error) {
    handleRouteError(res, error, 'Create team error:', 'Server error.');
  }
});

// POST /api/teams/join - Join a team via code (employee)
router.post('/join', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await teamService.joinTeam(req.body.join_code, req.user!.userId);
    res.json(result);
  } catch (error) {
    handleRouteError(res, error, 'Join team error:', 'Server error.');
  }
});

// GET /api/teams/:id/members - Get members of a team
router.get('/:id/members', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = getSingleValue(req.params.id);
    if (!teamId) {
      res.status(400).json({ error: 'Team id is required.' });
      return;
    }

    const members = await teamService.getTeamMembers(teamId);
    res.json(members);
  } catch (error) {
    handleRouteError(res, error, 'Get members error:', 'Server error.');
  }
});

// GET /api/teams - Get user's teams
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teams = await teamService.getUserTeams(req.user!.userId);
    res.json(teams);
  } catch (error) {
    handleRouteError(res, error, 'Get teams error:', 'Server error.');
  }
});

export default router;
