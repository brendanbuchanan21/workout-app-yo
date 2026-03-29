import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { computePRFeed, computeEnrichedPRs } from '../services/prService';
import { getExerciseDetail } from '../services/exerciseDetailService';

const router = Router();

function queryString(val: unknown): string | undefined {
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
  return undefined;
}

// List exercises (with optional filters)
router.get('/exercises', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const muscle = queryString(req.query.muscle);
    const equipment = queryString(req.query.equipment);
    const search = queryString(req.query.search);
    const movementType = queryString(req.query.movementType);

    const where: any = {
      OR: [
        { isDefault: true },
        { userId: req.userId! },
      ],
    };
    if (muscle) where.primaryMuscle = muscle;
    if (equipment) where.equipment = equipment;
    if (movementType) where.movementType = movementType;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const exercises = await prisma.exerciseCatalog.findMany({
      where,
      orderBy: [{ primaryMuscle: 'asc' }, { movementType: 'asc' }, { name: 'asc' }],
    });

    res.json({ exercises });
  } catch (error) {
    console.error('Get exercises error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create custom exercise
const createExerciseSchema = z.object({
  name: z.string().min(1),
  primaryMuscle: z.string(),
  secondaryMuscles: z.array(z.string()).default([]),
  equipment: z.string(),
  movementType: z.enum(['compound', 'isolation']),
  repRangeLow: z.number().int().min(1).default(6),
  repRangeHigh: z.number().int().min(1).default(12),
});

router.post('/exercises', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = createExerciseSchema.parse(req.body);

    const exercise = await prisma.exerciseCatalog.create({
      data: { ...data, isDefault: false, userId: req.userId! },
    });

    res.status(201).json({ exercise });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    if ((error as any)?.code === 'P2002') {
      res.status(400).json({ error: 'You already have an exercise with this name' });
      return;
    }
    console.error('Create exercise error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all personal records enriched with muscle group and equipment
router.get('/prs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const prs = await computeEnrichedPRs(req.userId!);
    res.json({ prs });
  } catch (error) {
    console.error('Get PRs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get PR feed — reverse-chronological timeline of PR-breaking moments
router.get('/prs/feed', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const prEvents = await computePRFeed(req.userId!);
    res.json({ prEvents });
  } catch (error) {
    console.error('Get PR feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get e1RM history and per-exercise progression for all exercises
router.get('/exercise-history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [sets, catalogs] = await Promise.all([
      prisma.exerciseSet.findMany({
        where: {
          completed: true,
          actualWeightKg: { not: null },
          actualReps: { not: null },
          exercise: {
            workoutSession: {
              userId: req.userId!,
              completedAt: { not: null },
            },
          },
        },
        include: {
          exercise: {
            select: {
              exerciseName: true,
              catalogId: true,
              muscleGroup: true,
              workoutSession: { select: { date: true } },
            },
          },
        },
      }),
      prisma.exerciseCatalog.findMany({
        where: {
          OR: [{ isDefault: true }, { userId: req.userId! }],
        },
        select: { id: true, primaryMuscle: true, equipment: true },
      }),
    ]);

    const catalogMap: Record<string, { primaryMuscle: string; equipment: string }> = {};
    for (const c of catalogs) {
      catalogMap[c.id] = { primaryMuscle: c.primaryMuscle, equipment: c.equipment };
    }

    // Group by exercise → by session date → best set and e1RM
    const exerciseMap: Record<string, {
      exerciseName: string;
      catalogId: string | null;
      primaryMuscle: string;
      equipment: string;
      sessions: Record<string, { bestWeightKg: number; bestReps: number; e1rm: number }>;
    }> = {};

    for (const set of sets) {
      const key = set.exercise.catalogId || set.exercise.exerciseName;
      const weight = set.actualWeightKg!;
      const reps = set.actualReps!;
      const date = set.exercise.workoutSession.date.toISOString().split('T')[0];

      // Epley formula: e1RM = weight × (1 + reps/30)
      const e1rm = reps === 1 ? weight : Math.round(weight * (1 + reps / 30) * 100) / 100;

      if (!exerciseMap[key]) {
        const catalog = set.exercise.catalogId ? catalogMap[set.exercise.catalogId] : null;
        exerciseMap[key] = {
          exerciseName: set.exercise.exerciseName,
          catalogId: set.exercise.catalogId,
          primaryMuscle: catalog?.primaryMuscle || set.exercise.muscleGroup,
          equipment: catalog?.equipment || 'unknown',
          sessions: {},
        };
      }

      const existing = exerciseMap[key].sessions[date];
      if (!existing || e1rm > existing.e1rm) {
        exerciseMap[key].sessions[date] = { bestWeightKg: weight, bestReps: reps, e1rm };
      }
    }

    // Convert to sorted arrays
    const exercises = Object.values(exerciseMap)
      .map((ex) => ({
        exerciseName: ex.exerciseName,
        catalogId: ex.catalogId,
        primaryMuscle: ex.primaryMuscle,
        equipment: ex.equipment,
        history: Object.entries(ex.sessions)
          .map(([date, data]) => ({
            date,
            bestWeightKg: data.bestWeightKg,
            bestReps: data.bestReps,
            e1rmKg: data.e1rm,
          }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      }))
      .filter((ex) => ex.history.length > 0)
      .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));

    res.json({ exercises });
  } catch (error) {
    console.error('Get exercise history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed exercise history with stats and charts
const detailRangeSchema = z.enum(['1m', '3m', '6m', '1y', 'all']).default('6m');

router.get('/exercise/:catalogId/detail', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const catalogId = String(req.params.catalogId);
    const range = detailRangeSchema.parse(queryString(req.query.range) || '6m');

    const detail = await getExerciseDetail(req.userId!, catalogId, range);
    if (!detail) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    res.json({ detail });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Get exercise detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get last performance for a catalog exercise
router.get('/exercise/:catalogId/last-performance', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const catalogId = String(req.params.catalogId);

    const exercise = await prisma.exercise.findFirst({
      where: {
        catalogId,
        workoutSession: {
          userId: req.userId!,
          completedAt: { not: null },
        },
      },
      orderBy: {
        workoutSession: { completedAt: 'desc' },
      },
      include: {
        sets: {
          orderBy: { setNumber: 'asc' },
          select: {
            actualWeightKg: true,
            actualReps: true,
            actualRir: true,
            setNumber: true,
          },
        },
      },
    });

    if (!exercise) {
      res.json({ sets: [] });
      return;
    }

    res.json({ sets: exercise.sets });
  } catch (error) {
    console.error('Get last performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
