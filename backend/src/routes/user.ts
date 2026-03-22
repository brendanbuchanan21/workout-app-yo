import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        sex: true,
        birthDate: true,
        heightCm: true,
        experienceLevel: true,
        daysPerWeek: true,
        unitPreference: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if user has an active training block
    const activeBlock = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
      select: { id: true, splitType: true, setupMethod: true },
    });

    // Get active nutrition phase
    const nutritionPhase = await prisma.nutritionPhase.findFirst({
      where: { userId: req.userId!, status: 'active' },
      select: {
        phaseType: true,
        currentCalories: true,
        currentProteinG: true,
        currentCarbsG: true,
        currentFatG: true,
      },
    });

    res.json({
      user: { ...user, hasActiveTrainingBlock: !!activeBlock },
      nutritionPhase,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
