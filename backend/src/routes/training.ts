import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import exerciseRoutes from './exercises';
import templateRoutes from './templates';
import trainingBlockRoutes from './trainingBlocks';
import sessionRoutes from './sessions';
import workoutRoutes from './workouts';
import volumeRoutes from './volume';
import progressionRoutes from './progression';
import recommendationRoutes from './recommendations';

const router = Router();

// Mount sub-routers
router.use(exerciseRoutes);
router.use(templateRoutes);
router.use(trainingBlockRoutes);
router.use(sessionRoutes);
router.use(workoutRoutes);
router.use(volumeRoutes);
router.use(progressionRoutes);
router.use(recommendationRoutes);

// Workout activity dates for heat map (last 365 days)
router.get('/activity', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: req.userId!,
        completedAt: { not: null },
        date: { gte: oneYearAgo },
      },
      select: {
        date: true,
        dayLabel: true,
      },
      orderBy: { date: 'asc' },
    });

    // Group by date, count sessions per day
    const activity: Record<string, { count: number; labels: string[] }> = {};
    for (const session of sessions) {
      const dateKey = new Date(session.date).toISOString().split('T')[0];
      if (!activity[dateKey]) activity[dateKey] = { count: 0, labels: [] };
      activity[dateKey].count++;
      if (session.dayLabel) activity[dateKey].labels.push(session.dayLabel);
    }

    res.json({ activity });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
