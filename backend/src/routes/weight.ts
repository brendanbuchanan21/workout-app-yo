import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const logWeightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().positive(),
  source: z.string().optional(),
});

// Log or update a body weight entry
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { date, weightKg, source } = logWeightSchema.parse(req.body);

    const entry = await prisma.bodyWeight.upsert({
      where: {
        userId_date: { userId: req.userId!, date: new Date(date) },
      },
      update: { weightKg, source: source || 'manual' },
      create: {
        userId: req.userId!,
        date: new Date(date),
        weightKg,
        source: source || 'manual',
      },
    });

    res.json({ entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Log weight error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get weight history
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { days } = req.query;
    const daysBack = days ? parseInt(days as string, 10) : 30;

    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const entries = await prisma.bodyWeight.findMany({
      where: {
        userId: req.userId!,
        date: { gte: since },
      },
      orderBy: { date: 'asc' },
    });

    res.json({ entries });
  } catch (error) {
    console.error('Get weights error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
