import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getRirForWeek } from '../services/workoutGenerator';
import { computeWorkoutSummary } from '../services/workoutSummary';

const router = Router();

// Get a session
router.get('/session/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.workoutSession.findUnique({
      where: { id: String(req.params.id) },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: { sets: { orderBy: { setNumber: 'asc' } } },
        },
      },
    });

    if (!session || session.userId !== req.userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start a session
router.put('/session/:id/start', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.workoutSession.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!session || session.userId !== req.userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const updated = await prisma.workoutSession.update({
      where: { id: session.id },
      data: { status: 'in_progress' },
    });

    res.json({ session: updated });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log a set
const logSetSchema = z.object({
  actualReps: z.number().int().min(0).optional(),
  actualRir: z.number().int().min(0).optional(),
  actualWeightKg: z.number().min(0).optional(),
  completed: z.boolean().optional(),
});

router.put('/set/:id/log', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = logSetSchema.parse(req.body);

    const set = await prisma.exerciseSet.findUnique({
      where: { id: String(req.params.id) },
      include: {
        exercise: {
          include: { workoutSession: true },
        },
      },
    });

    if (!set || set.exercise.workoutSession.userId !== req.userId) {
      res.status(404).json({ error: 'Set not found' });
      return;
    }

    const updated = await prisma.exerciseSet.update({
      where: { id: set.id },
      data: {
        actualReps: data.actualReps ?? set.actualReps,
        actualRir: data.actualRir ?? set.actualRir,
        actualWeightKg: data.actualWeightKg ?? set.actualWeightKg,
        completed: data.completed ?? true,
      },
    });

    res.json({ set: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Log set error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete a session
router.put('/session/:id/complete', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.workoutSession.findUnique({
      where: { id: String(req.params.id) },
      include: {
        exercises: {
          include: { sets: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!session || session.userId !== req.userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const completedAt = new Date();
    const updated = await prisma.workoutSession.update({
      where: { id: session.id },
      data: { status: 'completed', completedAt },
    });

    const summary = await computeWorkoutSummary(session, req.userId!, prisma, completedAt);

    res.json({ session: updated, summary });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a set to an exercise in an active session
router.post('/exercise/:exerciseId/set', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const exerciseId = String(req.params.exerciseId);

    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        workoutSession: true,
        sets: { orderBy: { setNumber: 'asc' } },
      },
    });

    if (!exercise || exercise.workoutSession.userId !== req.userId) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    if (exercise.sets.length >= 10) {
      res.status(400).json({ error: 'Maximum 10 sets per exercise' });
      return;
    }

    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSetNumber = (lastSet?.setNumber ?? 0) + 1;

    const set = await prisma.exerciseSet.create({
      data: {
        exerciseId,
        setNumber: newSetNumber,
        setType: 'working',
        targetReps: lastSet?.targetReps ?? null,
        targetRir: lastSet?.targetRir ?? null,
      },
    });

    res.status(201).json({ set });
  } catch (error) {
    console.error('Add set error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove the last set from an exercise
router.delete('/exercise/:exerciseId/set', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const exerciseId = String(req.params.exerciseId);

    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        workoutSession: true,
        sets: { orderBy: { setNumber: 'asc' } },
      },
    });

    if (!exercise || exercise.workoutSession.userId !== req.userId) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    if (exercise.sets.length <= 1) {
      res.status(400).json({ error: 'Cannot remove the only set' });
      return;
    }

    const lastSet = exercise.sets[exercise.sets.length - 1];
    await prisma.exerciseSet.delete({ where: { id: lastSet.id } });

    res.json({ removed: lastSet.id });
  } catch (error) {
    console.error('Remove set error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove an exercise from an active session
router.delete('/session/:sessionId/exercise/:exerciseId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = String(req.params.sessionId);
    const exerciseId = String(req.params.exerciseId);

    const session = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: { exercises: true },
    });

    if (!session || session.userId !== req.userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const exercise = session.exercises.find((e) => e.id === exerciseId);
    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found in session' });
      return;
    }

    if (session.exercises.length <= 1) {
      res.status(400).json({ error: 'Cannot remove the only exercise. End the workout instead.' });
      return;
    }

    // Delete sets first, then exercise
    await prisma.exerciseSet.deleteMany({ where: { exerciseId } });
    await prisma.exercise.delete({ where: { id: exerciseId } });

    // Re-fetch session
    const updatedSession = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: { sets: { orderBy: { setNumber: 'asc' } } },
        },
      },
    });

    res.json({ session: updatedSession });
  } catch (error) {
    console.error('Remove exercise error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add an exercise to an active session
const addExerciseToSessionSchema = z.object({
  catalogId: z.string().optional(),
  exerciseName: z.string().min(1),
  muscleGroup: z.string().min(1),
  sets: z.number().int().min(1).max(10).default(3),
  repRangeLow: z.number().int().optional(),
  repRangeHigh: z.number().int().optional(),
});

router.post('/session/:id/exercise', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = addExerciseToSessionSchema.parse(req.body);
    const sessionId = String(req.params.id);

    const session = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: { exercises: true },
    });

    if (!session || session.userId !== req.userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const block = await prisma.trainingBlock.findUnique({
      where: { id: session.trainingBlockId },
    });

    const rir = block
      ? getRirForWeek(block.currentWeek, block.lengthWeeks, block)
      : 3;

    const maxOrder = Math.max(...session.exercises.map((e) => e.orderIndex), -1);

    const exercise = await prisma.exercise.create({
      data: {
        workoutSessionId: sessionId,
        catalogId: data.catalogId || null,
        orderIndex: maxOrder + 1,
        exerciseName: data.exerciseName,
        muscleGroup: data.muscleGroup,
      },
    });

    const repTarget = data.repRangeLow && data.repRangeHigh
      ? Math.round((data.repRangeLow + data.repRangeHigh) / 2)
      : null;

    for (let s = 1; s <= data.sets; s++) {
      await prisma.exerciseSet.create({
        data: {
          exerciseId: exercise.id,
          setNumber: s,
          setType: 'working',
          targetReps: repTarget,
          targetRir: rir,
        },
      });
    }

    // Re-fetch full session
    const updatedSession = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: { sets: { orderBy: { setNumber: 'asc' } } },
        },
      },
    });

    res.status(201).json({ session: updatedSession });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Add exercise to session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
