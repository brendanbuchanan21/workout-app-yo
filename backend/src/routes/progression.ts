import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { analyzeProgression } from '../services/progressionAnalysis';

const router = Router();

// Get progression status for all exercises in the active training block
router.get('/progression/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block' });
      return;
    }

    const progressions = await analyzeProgression(req.userId!, block.id);
    res.json({ progressions, phaseIntent: block.phaseIntent });
  } catch (error) {
    console.error('Get progression status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
