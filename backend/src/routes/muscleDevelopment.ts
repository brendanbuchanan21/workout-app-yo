import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getMuscleDevelopmentSignals } from '../services/muscleDevelopmentSignals';

const router = Router();

router.get('/muscle-development-signals', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await getMuscleDevelopmentSignals(req.userId!);
    res.json(result);
  } catch (error) {
    console.error('Get muscle development signals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
