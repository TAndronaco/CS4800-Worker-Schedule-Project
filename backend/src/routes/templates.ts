import { Router, Response } from 'express';
import { authenticate, requireManager, AuthRequest } from '../middleware/auth';
import { templateService } from '../services/templateService';
import { getSingleValue } from '../utils/getSingleValue';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// POST /api/templates - Save a schedule template
router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const template = await templateService.create(req.body, req.user!.userId);
    res.status(201).json(template);
  } catch (error) {
    handleRouteError(res, error, 'Create template error:', 'Server error.');
  }
});

// GET /api/templates?team_id=X - Get templates for a team
router.get('/', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = typeof req.query.team_id === 'string' ? req.query.team_id : undefined;
    if (!teamId) {
      res.status(400).json({ error: 'team_id is required.' });
      return;
    }
    const templates = await templateService.getForTeam(teamId);
    res.json(templates);
  } catch (error) {
    handleRouteError(res, error, 'Get templates error:', 'Server error.');
  }
});

// GET /api/templates/:id - Get a single template
router.get('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const template = await templateService.getById(getSingleValue(req.params.id) || '');
    res.json(template);
  } catch (error) {
    handleRouteError(res, error, 'Get template error:', 'Server error.');
  }
});

// DELETE /api/templates/:id - Delete a template
router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await templateService.deleteTemplate(getSingleValue(req.params.id) || '', req.user!.userId);
    res.json({ message: 'Template deleted.' });
  } catch (error) {
    handleRouteError(res, error, 'Delete template error:', 'Server error.');
  }
});

export default router;
