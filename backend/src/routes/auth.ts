import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { handleRouteError } from '../utils/handleRouteError';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    handleRouteError(res, error, 'Registration error:', 'Server error.');
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    handleRouteError(res, error, 'Login error:', 'Server error.');
  }
});

export default router;
