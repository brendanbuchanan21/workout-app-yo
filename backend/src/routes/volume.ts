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

// Volume history per muscle group (weekly buckets), optionally filtered by range
router.get('/volume-history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rangeMonths: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 };
    const rangeParam = typeof req.query.range === 'string' ? req.query.range : undefined;
    const dateFilter: any = { not: null };
    if (rangeParam && rangeMonths[rangeParam]) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - rangeMonths[rangeParam] * 2);
      dateFilter.gte = cutoff;
    }

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: req.userId!,
        completedAt: dateFilter,
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

// Per-exercise volume comparison: current week vs previous week
router.get('/exercise-volume-comparison', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    const currentWeek = block.currentWeek;
    const previousWeek = currentWeek - 1;

    // Fetch completed sessions for current and previous week
    const sessions = await prisma.workoutSession.findMany({
      where: {
        trainingBlockId: block.id,
        weekNumber: { in: previousWeek >= 1 ? [currentWeek, previousWeek] : [currentWeek] },
        completedAt: { not: null },
      },
      include: {
        exercises: {
          include: { sets: true },
        },
      },
    });

    interface ExerciseVolume {
      sets: number;
      tonnageKg: number;
    }

    // Aggregate per exercise per week
    const exerciseByWeek: Record<string, Record<number, ExerciseVolume & {
      exerciseName: string; catalogId: string | null; muscleGroup: string;
    }>> = {};

    for (const session of sessions) {
      for (const exercise of session.exercises) {
        const key = exercise.catalogId || exercise.exerciseName;
        if (!exerciseByWeek[key]) exerciseByWeek[key] = {};

        const completedSets = exercise.sets.filter((s) => s.completed);
        const sets = completedSets.length;
        const tonnageKg = completedSets.reduce((sum, s) => {
          return sum + (s.actualWeightKg || 0) * (s.actualReps || 0);
        }, 0);

        const existing = exerciseByWeek[key][session.weekNumber];
        if (existing) {
          existing.sets += sets;
          existing.tonnageKg += tonnageKg;
        } else {
          exerciseByWeek[key][session.weekNumber] = {
            exerciseName: exercise.exerciseName,
            catalogId: exercise.catalogId,
            muscleGroup: exercise.muscleGroup,
            sets,
            tonnageKg: Math.round(tonnageKg * 100) / 100,
          };
        }
      }
    }

    // Build per-exercise comparison
    const exercises = Object.values(exerciseByWeek).map((weekData) => {
      const curr = weekData[currentWeek];
      const prev = weekData[previousWeek];
      const ref = curr || prev!;
      return {
        exerciseName: ref.exerciseName,
        catalogId: ref.catalogId,
        muscleGroup: ref.muscleGroup,
        current: curr ? { sets: curr.sets, tonnageKg: Math.round(curr.tonnageKg * 100) / 100 } : null,
        previous: prev ? { sets: prev.sets, tonnageKg: Math.round(prev.tonnageKg * 100) / 100 } : null,
      };
    }).sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));

    // Build per-muscle-group rollup
    const muscleByWeek: Record<string, Record<number, ExerciseVolume>> = {};
    for (const ex of Object.values(exerciseByWeek)) {
      for (const [weekStr, data] of Object.entries(ex)) {
        const week = Number(weekStr);
        const muscle = data.muscleGroup;
        if (!muscleByWeek[muscle]) muscleByWeek[muscle] = {};
        const existing = muscleByWeek[muscle][week];
        if (existing) {
          existing.sets += data.sets;
          existing.tonnageKg += data.tonnageKg;
        } else {
          muscleByWeek[muscle][week] = { sets: data.sets, tonnageKg: data.tonnageKg };
        }
      }
    }

    const muscleGroups = Object.entries(muscleByWeek).map(([muscle, weekData]) => {
      const curr = weekData[currentWeek];
      const prev = weekData[previousWeek];
      return {
        muscle,
        current: curr ? { sets: curr.sets, tonnageKg: Math.round(curr.tonnageKg * 100) / 100 } : null,
        previous: prev ? { sets: prev.sets, tonnageKg: Math.round(prev.tonnageKg * 100) / 100 } : null,
      };
    }).sort((a, b) => a.muscle.localeCompare(b.muscle));

    res.json({ currentWeek, exercises, muscleGroups });
  } catch (error) {
    console.error('Get exercise volume comparison error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Per-muscle weekly volume for the active training block
router.get('/block-weekly-volume', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    const sessions = await prisma.workoutSession.findMany({
      where: { trainingBlockId: block.id },
      include: {
        exercises: {
          include: { sets: true },
        },
      },
    });

    const volumeTargets = (block.volumeTargets as Record<string, number>) || {};

    // Initialize data: { muscle: [null, null, ...] } length = lengthWeeks
    const data: Record<string, (number | null)[]> = {};
    for (const muscle of Object.keys(volumeTargets)) {
      data[muscle] = Array(block.lengthWeeks).fill(null);
    }

    // Tally completed sets per muscle per week
    for (const session of sessions) {
      const weekIdx = session.weekNumber - 1;
      if (weekIdx < 0 || weekIdx >= block.lengthWeeks) continue;

      for (const exercise of session.exercises) {
        const muscle = exercise.muscleGroup;
        const completedSets = exercise.sets.filter(
          (s) => s.completed && s.setType === 'working'
        ).length;
        if (completedSets === 0) continue;

        if (!data[muscle]) {
          data[muscle] = Array(block.lengthWeeks).fill(null);
        }
        data[muscle][weekIdx] = (data[muscle][weekIdx] || 0) + completedSets;
      }
    }

    res.json({
      lengthWeeks: block.lengthWeeks,
      currentWeek: block.currentWeek,
      volumeTargets,
      data,
    });
  } catch (error) {
    console.error('Get block weekly volume error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
