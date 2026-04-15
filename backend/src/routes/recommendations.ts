import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { generateRecommendations } from '../services/recommendationEngine';

const router = Router();

// Get phase-dependent recommendations based on the cross-signal model
router.get('/recommendations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const recommendations = await generateRecommendations(req.userId!);
    res.json({ recommendations });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
