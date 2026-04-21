import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  getRirForWeek,
  getDayLabels,
  getMuscleGroupsForDay,
} from '../services/workoutGenerator';
import { prescribeSession } from '../services/sessionAutoregulation';

const router = Router();

// Get today's context (split day, muscle groups, volume status)
router.get('/today', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    // Count completed sessions this week to determine which day we're on
    const sessionsThisWeek = await prisma.workoutSession.findMany({
      where: {
        trainingBlockId: block.id,
        weekNumber: block.currentWeek,
      },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          select: { exerciseName: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    const completedCount = sessionsThisWeek.filter((s) => s.status === 'completed').length;
    const dayIndex = completedCount % block.daysPerWeek;

    const customDays = block.customDays as { dayLabel: string; muscleGroups: string[] }[] | undefined;
    const dayLabels = getDayLabels(block.splitType, block.daysPerWeek, customDays);
    const rir = getRirForWeek(block.currentWeek, block.lengthWeeks, block);

    // Build completion info per day label for this week
    const dayCompletions: Record<string, { completed: boolean; exercises: string[] }> = {};
    for (const s of sessionsThisWeek) {
      if (s.status === 'completed') {
        dayCompletions[s.dayLabel] = {
          completed: true,
          exercises: s.exercises.map((e) => e.exerciseName),
        };
      }
    }

    // For build-as-you-go, return all day options so user can choose
    if (block.setupMethod === 'build_as_you_go') {
      const dayOptions = dayLabels.map((label, i) => ({
        dayLabel: label,
        muscleGroups: getMuscleGroupsForDay(block.splitType, i, customDays),
        completed: dayCompletions[label]?.completed || false,
        exercises: dayCompletions[label]?.exercises || [],
      }));

      res.json({
        trainingBlockId: block.id,
        weekNumber: block.currentWeek,
        dayIndex,
        dayLabel: dayLabels[dayIndex],
        dayOptions,
        suggestedMuscleGroups: getMuscleGroupsForDay(block.splitType, dayIndex, customDays),
        targetRir: rir,
        splitType: block.splitType,
        volumeTargets: block.volumeTargets,
        setupMethod: block.setupMethod,
      });
      return;
    }

    const muscleGroups = getMuscleGroupsForDay(block.splitType, dayIndex, customDays);

    res.json({
      trainingBlockId: block.id,
      weekNumber: block.currentWeek,
      dayIndex,
      dayLabel: dayLabels[dayIndex],
      suggestedMuscleGroups: muscleGroups,
      targetRir: rir,
      splitType: block.splitType,
      volumeTargets: block.volumeTargets,
      setupMethod: block.setupMethod,
    });
  } catch (error) {
    console.error('Get today error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get prescription for next session based on previous performance
router.get('/prescription/:dayLabel', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const dayLabel = String(req.params.dayLabel);

    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    const targetRir = getRirForWeek(block.currentWeek, block.lengthWeeks, block);

    // Find the last 3 completed sessions with this day label in this training block
    // (need 3 for consecutive decline detection: N vs N-1, N-1 vs N-2)
    const previousSessions = await prisma.workoutSession.findMany({
      where: {
        trainingBlockId: block.id,
        dayLabel,
        completedAt: { not: null },
      },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: {
            sets: { orderBy: { setNumber: 'asc' } },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 3,
    });

    if (previousSessions.length === 0) {
      res.json({ prescription: null });
      return;
    }

    const lastSession = previousSessions[0];
    const olderSessions = previousSessions.slice(1); // up to 2 older sessions

    // Build rep range lookup from catalog
    const catalogIds = lastSession.exercises
      .filter((e) => e.catalogId)
      .map((e) => e.catalogId!);

    const catalogEntries = catalogIds.length > 0
      ? await prisma.exerciseCatalog.findMany({
          where: { id: { in: catalogIds } },
          select: { id: true, repRangeLow: true, repRangeHigh: true, movementType: true },
        })
      : [];

    const repRanges: Record<string, { low: number; high: number }> = {};
    const movementTypes: Record<string, string> = {};
    for (const entry of catalogEntries) {
      repRanges[entry.id] = { low: entry.repRangeLow, high: entry.repRangeHigh };
      movementTypes[entry.id] = entry.movementType;
    }

    function mapSessionExercises(session: typeof lastSession) {
      return session.exercises.map((e) => ({
        catalogId: e.catalogId,
        exerciseName: e.exerciseName,
        muscleGroup: e.muscleGroup,
        movementType: (e.catalogId ? movementTypes[e.catalogId] : 'isolation') as 'compound' | 'isolation',
        sets: e.sets.map((s) => ({
          setNumber: s.setNumber,
          actualWeightKg: s.actualWeightKg,
          actualReps: s.actualReps,
          actualRir: s.actualRir,
          completed: s.completed,
        })),
      }));
    }

    const prevExercises = mapSessionExercises(lastSession);
    const olderSessionsList = olderSessions.length > 0
      ? olderSessions.map(mapSessionExercises)
      : null;

    const prescription = prescribeSession(prevExercises, targetRir, repRanges, olderSessionsList);

    res.json({ prescription });
  } catch (error) {
    console.error('Get prescription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a session (for Build As You Go)
const createSessionSchema = z.object({
  dayLabel: z.string(),
  exercises: z.array(z.object({
    catalogId: z.string().optional(),
    exerciseName: z.string(),
    muscleGroup: z.string(),
    sets: z.number().int().min(1).max(10),
    repRangeLow: z.number().int().optional(),
    repRangeHigh: z.number().int().optional(),
    prescription: z.array(z.object({
      setNumber: z.number().int(),
      targetWeightKg: z.number().nullable().optional(),
      targetReps: z.number().int().nullable().optional(),
      targetRir: z.number().int().optional(),
    })).optional(),
  })),
});

router.post('/session/create', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = createSessionSchema.parse(req.body);

    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    // Set setupMethod if not yet set
    if (!block.setupMethod) {
      await prisma.trainingBlock.update({
        where: { id: block.id },
        data: { setupMethod: 'build_as_you_go' },
      });
    }

    const rir = getRirForWeek(block.currentWeek, block.lengthWeeks, block);

    const session = await prisma.workoutSession.create({
      data: {
        trainingBlockId: block.id,
        userId: req.userId!,
        date: new Date(new Date().toISOString().split('T')[0]),
        weekNumber: block.currentWeek,
        dayLabel: data.dayLabel,
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    for (let i = 0; i < data.exercises.length; i++) {
      const exDef = data.exercises[i];

      const exercise = await prisma.exercise.create({
        data: {
          workoutSessionId: session.id,
          catalogId: exDef.catalogId || null,
          orderIndex: i,
          exerciseName: exDef.exerciseName,
          muscleGroup: exDef.muscleGroup,
        },
      });

      const repTarget = exDef.repRangeLow && exDef.repRangeHigh
        ? Math.round((exDef.repRangeLow + exDef.repRangeHigh) / 2)
        : null;

      for (let s = 1; s <= exDef.sets; s++) {
        const setPrescription = exDef.prescription?.find((p) => p.setNumber === s);
        await prisma.exerciseSet.create({
          data: {
            exerciseId: exercise.id,
            setNumber: s,
            setType: 'working',
            targetReps: setPrescription?.targetReps ?? repTarget,
            targetRir: setPrescription?.targetRir ?? rir,
            targetWeightKg: setPrescription?.targetWeightKg ?? null,
          },
        });
      }
    }

    // Fetch the full session to return
    const fullSession = await prisma.workoutSession.findUnique({
      where: { id: session.id },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: { sets: { orderBy: { setNumber: 'asc' } } },
        },
      },
    });

    res.status(201).json({ session: fullSession });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get program structure — exercises for each day label
router.get('/program/days', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    const dayLabels = getDayLabels(block.splitType, block.daysPerWeek, block.customDays as any);

    // Get completed sessions for the current week
    const completedThisWeek = await prisma.workoutSession.findMany({
      where: {
        trainingBlockId: block.id,
        weekNumber: block.currentWeek,
        status: 'completed',
      },
      select: { dayLabel: true, completedAt: true },
    });
    const completionMap = new Map(
      completedThisWeek.map((s) => [s.dayLabel, s.completedAt])
    );

    // For each day label, read the current/future planned session that defines the program.
    const days = await Promise.all(
      dayLabels.map(async (dl, i) => {
        const session = await prisma.workoutSession.findFirst({
          where: {
            trainingBlockId: block.id,
            dayLabel: dl,
            weekNumber: { gte: block.currentWeek },
          },
          orderBy: [{ weekNumber: 'asc' }, { date: 'asc' }],
          include: {
            exercises: {
              orderBy: { orderIndex: 'asc' },
              include: { sets: { orderBy: { setNumber: 'asc' } } },
            },
          },
        });

        return {
          dayLabel: dl,
          muscleGroups: getMuscleGroupsForDay(block.splitType, i, block.customDays as any),
          completedThisWeek: completionMap.has(dl),
          completedAt: completionMap.get(dl) ?? null,
          exercises: session?.exercises.map((e) => ({
            id: e.id,
            catalogId: e.catalogId,
            exerciseName: e.exerciseName,
            muscleGroup: e.muscleGroup,
            sets: e.sets.length,
            repRangeLow: e.sets.length > 0 ? Math.min(...e.sets.map((s) => s.targetReps || 6)) : 6,
            repRangeHigh: e.sets.length > 0 ? Math.max(...e.sets.map((s) => s.targetReps || 12)) : 12,
          })) || [],
        };
      })
    );

    res.json({ days, currentWeek: block.currentWeek });
  } catch (error) {
    console.error('Get program days error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update exercises for a day label across all future planned sessions
const updateDayExercisesSchema = z.object({
  exercises: z.array(z.object({
    catalogId: z.string().nullable().optional(),
    exerciseName: z.string(),
    muscleGroup: z.string(),
    sets: z.number().int().min(1).max(10),
    repRangeLow: z.number().int().optional(),
    repRangeHigh: z.number().int().optional(),
  })),
});

router.put('/program/day/:dayLabel/exercises', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateDayExercisesSchema.parse(req.body);
    const dayLabel = decodeURIComponent(String(req.params.dayLabel));

    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    const customDays = block.customDays as { dayLabel: string; muscleGroups: string[] }[] | undefined;
    const dayLabels = getDayLabels(block.splitType, block.daysPerWeek, customDays);
    const dayIdx = dayLabels.indexOf(dayLabel);

    if (dayIdx === -1) {
      res.status(400).json({ error: 'Unknown program day' });
      return;
    }

    // Find all planned sessions for this day label (current week onward)
    const plannedSessions = await prisma.workoutSession.findMany({
      where: {
        trainingBlockId: block.id,
        dayLabel,
        status: 'planned',
        weekNumber: { gte: block.currentWeek },
      },
    });

    const plannedByWeek = new Map(plannedSessions.map((session) => [session.weekNumber, session]));

    // Materialize any missing planned sessions so a planned day exists before the user starts it.
    for (let week = block.currentWeek; week <= block.lengthWeeks; week++) {
      if (plannedByWeek.has(week)) continue;

      const existingSession = await prisma.workoutSession.findFirst({
        where: {
          trainingBlockId: block.id,
          dayLabel,
          weekNumber: week,
        },
        select: { id: true },
      });

      if (existingSession) continue;

      const session = await prisma.workoutSession.create({
        data: {
          trainingBlockId: block.id,
          userId: req.userId!,
          date: new Date(block.startDate.getTime() + ((week - 1) * 7 + dayIdx) * 86400000),
          weekNumber: week,
          dayLabel,
          status: 'planned',
        },
      });

      plannedSessions.push(session);
      plannedByWeek.set(week, session);
    }

    // Update each planned session: delete old exercises, create new ones
    for (const session of plannedSessions) {
      const rir = getRirForWeek(session.weekNumber, block.lengthWeeks, block);

      // Delete existing exercises (cascades to sets)
      await prisma.exercise.deleteMany({
        where: { workoutSessionId: session.id },
      });

      // Create new exercises
      for (let i = 0; i < data.exercises.length; i++) {
        const exDef = data.exercises[i];
        const midReps = Math.round(((exDef.repRangeLow || 6) + (exDef.repRangeHigh || 12)) / 2);

        const exercise = await prisma.exercise.create({
          data: {
            workoutSessionId: session.id,
            catalogId: exDef.catalogId || null,
            orderIndex: i,
            exerciseName: exDef.exerciseName,
            muscleGroup: exDef.muscleGroup,
          },
        });

        for (let s = 1; s <= exDef.sets; s++) {
          await prisma.exerciseSet.create({
            data: {
              exerciseId: exercise.id,
              setNumber: s,
              setType: 'working',
              targetReps: midReps,
              targetRir: rir,
            },
          });
        }
      }
    }

    res.json({ message: 'Program updated', sessionsUpdated: plannedSessions.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update day exercises error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder days in the program
const reorderDaysSchema = z.object({
  days: z.array(z.object({
    dayLabel: z.string().min(1),
    muscleGroups: z.array(z.string()).min(1),
  })),
});

router.put('/program/reorder-days', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = reorderDaysSchema.parse(req.body);

    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    if (data.days.length !== block.daysPerWeek) {
      res.status(400).json({ error: `Expected ${block.daysPerWeek} days, got ${data.days.length}` });
      return;
    }

    // Save reordered days as customDays on the training block
    await prisma.trainingBlock.update({
      where: { id: block.id },
      data: { customDays: data.days },
    });

    res.json({ message: 'Day order updated' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Reorder days error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
