import { Router, Response } from 'express';
import { z } from 'zod';
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
        bodyFatPercent: true,
        experienceLevel: true,
        activityLevel: true,
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

const updateProfileSchema = z.object({
  displayName: z.string().min(1).optional(),
  sex: z.enum(['male', 'female']).optional(),
  birthDate: z.string().optional(),
  heightCm: z.number().positive().optional(),
  bodyFatPercent: z.number().min(3).max(60).nullable().optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active']).optional(),
  daysPerWeek: z.number().int().min(3).max(6).optional(),
  unitPreference: z.enum(['imperial', 'metric']).optional(),
});

router.put('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const updateData: Record<string, any> = { ...data };
    if (data.birthDate) {
      updateData.birthDate = new Date(data.birthDate);
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        sex: true,
        birthDate: true,
        heightCm: true,
        bodyFatPercent: true,
        experienceLevel: true,
        activityLevel: true,
        daysPerWeek: true,
        unitPreference: true,
        createdAt: true,
      },
      data: updateData,
    });

    res.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
