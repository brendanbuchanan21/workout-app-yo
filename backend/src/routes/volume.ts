import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  VOLUME_GUARDRAILS,
  getEffectiveGuardrails,
} from '../services/workoutGenerator';

const router = Router();

// Update volume targets (with volume guardrails)
router.put('/volume-targets', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      volumeTargets: z.record(z.string(), z.number().int().min(0)),
    });

    const { volumeTargets } = schema.parse(req.body);

    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    // Validate against effective guardrails
    const effectiveGuardrails = getEffectiveGuardrails(block.customGuardrails as any);
    const errors: string[] = [];
    for (const [muscle, sets] of Object.entries(volumeTargets)) {
      const guardrail = effectiveGuardrails[muscle];
      if (guardrail) {
        if (sets < guardrail.floor) {
          errors.push(`${muscle}: minimum ${guardrail.floor} sets`);
        }
        if (sets > guardrail.ceiling) {
          errors.push(`${muscle}: maximum ${guardrail.ceiling} sets`);
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ error: 'Volume out of range', details: errors });
      return;
    }

    const updated = await prisma.trainingBlock.update({
      where: { id: block.id },
      data: { volumeTargets },
    });

    res.json({ trainingBlock: updated, guardrails: effectiveGuardrails });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update volume targets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get volume guardrails (effective = defaults merged with custom overrides)
router.get('/volume-guardrails', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    const effectiveGuardrails = getEffectiveGuardrails(block?.customGuardrails as any);
    res.json({ guardrails: effectiveGuardrails, defaults: VOLUME_GUARDRAILS });
  } catch (error) {
    console.error('Get volume guardrails error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update custom volume guardrails on active training block
router.put('/volume-guardrails', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      customGuardrails: z.record(
        z.string(),
        z.object({
          floor: z.number().int().min(0).optional(),
          ceiling: z.number().int().min(1).optional(),
        })
      ),
    });

    const { customGuardrails } = schema.parse(req.body);

    // Validate floor < ceiling for each muscle
    const errors: string[] = [];
    for (const [muscle, overrides] of Object.entries(customGuardrails)) {
      const defaults = VOLUME_GUARDRAILS[muscle];
      if (!defaults) {
        errors.push(`Unknown muscle group: ${muscle}`);
        continue;
      }
      const floor = overrides.floor ?? defaults.floor;
      const ceiling = overrides.ceiling ?? defaults.ceiling;
      if (floor >= ceiling) {
        errors.push(`${muscle}: floor (${floor}) must be less than ceiling (${ceiling})`);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ error: 'Invalid guardrails', details: errors });
      return;
    }

    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    // Merge with existing custom guardrails
    const existing = (block.customGuardrails as Record<string, any>) || {};
    const merged = { ...existing, ...customGuardrails };

    // Remove entries that match defaults (keep sparse)
    for (const [muscle, overrides] of Object.entries(merged)) {
      const defaults = VOLUME_GUARDRAILS[muscle];
      if (defaults &&
        (overrides.floor === undefined || overrides.floor === defaults.floor) &&
        (overrides.ceiling === undefined || overrides.ceiling === defaults.ceiling)) {
        delete merged[muscle];
      }
    }

    const updated = await prisma.trainingBlock.update({
      where: { id: block.id },
      data: { customGuardrails: Object.keys(merged).length > 0 ? merged : Prisma.DbNull },
    });

    const effectiveGuardrails = getEffectiveGuardrails(updated.customGuardrails as any);
    res.json({ trainingBlock: updated, guardrails: effectiveGuardrails });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update volume guardrails error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get weekly volume summary (planned vs completed)
router.get('/volume-summary', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
      include: {
        workoutSessions: {
          where: { weekNumber: { equals: undefined } }, // will override below
          include: {
            exercises: {
              include: { sets: true },
            },
          },
        },
      },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    // Get sessions for current week
    const sessions = await prisma.workoutSession.findMany({
      where: {
        trainingBlockId: block.id,
        weekNumber: block.currentWeek,
      },
      include: {
        exercises: {
          include: { sets: true },
        },
      },
    });

    // Tally volume per muscle group
    const volumeCompleted: Record<string, number> = {};
    const volumePlanned: Record<string, number> = {};

    for (const session of sessions) {
      for (const exercise of session.exercises) {
        const muscle = exercise.muscleGroup;
        const completedSets = exercise.sets.filter((s) => s.completed).length;
        const totalSets = exercise.sets.filter((s) => s.setType === 'working').length;

        volumeCompleted[muscle] = (volumeCompleted[muscle] || 0) + completedSets;
        volumePlanned[muscle] = (volumePlanned[muscle] || 0) + totalSets;
      }
    }

    const volumeTargets = block.volumeTargets as Record<string, number>;

    const effectiveGuardrails = getEffectiveGuardrails(block.customGuardrails as any);

    res.json({
      weekNumber: block.currentWeek,
      volumeTargets,
      volumePlanned,
      volumeCompleted,
      guardrails: effectiveGuardrails,
    });
  } catch (error) {
    console.error('Get volume summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// All-time volume history per muscle group (weekly buckets)
router.get('/volume-history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: req.userId!,
        completedAt: { not: null },
      },
      include: {
        exercises: {
          include: { sets: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Bucket by ISO week
    const weeklyVolume: Record<string, Record<string, number>> = {};

    for (const session of sessions) {
      const d = new Date(session.date);
      // Get ISO week start (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d);
      weekStart.setDate(diff);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyVolume[weekKey]) weeklyVolume[weekKey] = {};

      for (const exercise of session.exercises) {
        const muscle = exercise.muscleGroup;
        const completedSets = exercise.sets.filter((s) => s.completed).length;
        weeklyVolume[weekKey][muscle] = (weeklyVolume[weekKey][muscle] || 0) + completedSets;
      }
    }

    // Convert to sorted array
    const weeks = Object.entries(weeklyVolume)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, muscles]) => ({ weekStart, muscles }));

    res.json({ weeks });
  } catch (error) {
    console.error('Get volume history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
