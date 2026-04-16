import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getEffectiveGuardrails } from '../services/workoutGenerator';

const router = Router();

// Starting volume per muscle group by experience level
export function getStartingVolume(experienceLevel: string): Record<string, number> {
  const volumes: Record<string, Record<string, number>> = {
    beginner: {
      chest: 8, back: 8, side_delts: 6, quads: 6,
      hamstrings: 4, biceps: 4, triceps: 4, rear_delts: 4, calves: 4, abs: 4,
    },
    intermediate: {
      chest: 10, back: 10, side_delts: 10, quads: 8,
      hamstrings: 6, biceps: 8, triceps: 6, rear_delts: 6, calves: 6, abs: 4,
    },
    advanced: {
      chest: 12, back: 12, side_delts: 12, quads: 10,
      hamstrings: 8, biceps: 10, triceps: 8, rear_delts: 8, calves: 8, abs: 6,
    },
  };
  return volumes[experienceLevel] || volumes.intermediate;
}

// Create a new training block
const createBlockSchema = z.object({
  splitType: z.enum(['full_body', 'upper_lower', 'push_pull_legs', 'custom']),
  daysPerWeek: z.number().int().min(3).max(6),
  setupMethod: z.enum(['template', 'plan', 'build_as_you_go']),
  customDays: z.array(z.object({
    dayLabel: z.string().min(1),
    muscleGroups: z.array(z.string()).min(1),
  })).optional(),
  volumeTargets: z.record(z.string(), z.number().int().min(0)).optional(),
  lengthWeeks: z.number().int().min(3).max(8).default(5),
  startingRir: z.number().int().min(0).max(5).default(3),
  rirFloor: z.number().int().min(0).max(3).default(1),
  rirDecrementPerWeek: z.number().min(0.5).max(1).default(1),
  deloadRir: z.number().int().min(4).max(7).default(6),
  phaseIntent: z.enum(['bulk', 'cut', 'maintain']).optional(),
  targetWeightChangePerWeek: z.number().optional(),
});

router.post('/block/create', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = createBlockSchema.parse(req.body);

    // End any existing active training block
    await prisma.trainingBlock.updateMany({
      where: { userId: req.userId!, status: 'active' },
      data: { status: 'completed', endDate: new Date() },
    });

    // Get user for experience level
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    // Count previous training blocks
    const blockCount = await prisma.trainingBlock.count({ where: { userId: req.userId! } });

    // Use provided volume targets or default based on experience
    const volumeTargets = data.volumeTargets || getStartingVolume(user?.experienceLevel || 'intermediate');

    const trainingBlock = await prisma.trainingBlock.create({
      data: {
        userId: req.userId!,
        blockNumber: blockCount + 1,
        startDate: new Date(),
        lengthWeeks: data.lengthWeeks,
        currentWeek: 1,
        splitType: data.splitType,
        daysPerWeek: data.daysPerWeek,
        setupMethod: data.setupMethod,
        customDays: data.splitType === 'custom' ? data.customDays : undefined,
        volumeTargets,
        startingRir: data.startingRir,
        rirFloor: data.rirFloor,
        rirDecrementPerWeek: data.rirDecrementPerWeek,
        deloadRir: data.deloadRir,
        phaseIntent: data.phaseIntent,
        targetWeightChangePerWeek: data.targetWeightChangePerWeek,
      },
    });

    res.status(201).json({ trainingBlock });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create training block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update active training block in-place
const updateBlockSchema = z.object({
  splitType: z.enum(['full_body', 'upper_lower', 'push_pull_legs', 'custom']).optional(),
  daysPerWeek: z.number().int().min(3).max(6).optional(),
  lengthWeeks: z.number().int().min(3).max(8).optional(),
  customDays: z.array(z.object({
    dayLabel: z.string().min(1),
    muscleGroups: z.array(z.string()).min(1),
  })).optional(),
  volumeTargets: z.record(z.string(), z.number().int().min(0)).optional(),
  startingRir: z.number().int().min(0).max(5).optional(),
  rirFloor: z.number().int().min(0).max(3).optional(),
  rirDecrementPerWeek: z.number().min(0.5).max(1).optional(),
  deloadRir: z.number().int().min(4).max(7).optional(),
  phaseIntent: z.enum(['bulk', 'cut', 'maintain']).optional(),
  targetWeightChangePerWeek: z.number().optional(),
});

router.put('/block/active', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateBlockSchema.parse(req.body);

    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    const splitChangeRequested = data.splitType !== undefined && data.splitType !== block.splitType;
    if (splitChangeRequested) {
      const completedSessions = await prisma.workoutSession.count({
        where: {
          trainingBlockId: block.id,
          status: 'completed',
        },
      });

      if (completedSessions > 0) {
        res.status(400).json({
          error: 'Split type is locked after you start the block. End this block to switch program styles.',
        });
        return;
      }
    }

    // Validate lengthWeeks >= currentWeek
    if (data.lengthWeeks !== undefined && data.lengthWeeks < block.currentWeek) {
      res.status(400).json({ error: `Cannot shorten below current week (${block.currentWeek})` });
      return;
    }

    // Validate customDays required when splitType is custom
    const effectiveSplit = data.splitType ?? block.splitType;
    const effectiveDays = data.daysPerWeek ?? block.daysPerWeek;
    if (effectiveSplit === 'custom') {
      const effectiveCustomDays = data.customDays ?? (block.customDays as any[] | undefined);
      if (!effectiveCustomDays || effectiveCustomDays.length === 0) {
        res.status(400).json({ error: 'customDays required for custom split' });
        return;
      }
      if (effectiveCustomDays.length !== effectiveDays) {
        res.status(400).json({ error: `customDays length (${effectiveCustomDays.length}) must match daysPerWeek (${effectiveDays})` });
        return;
      }
    }

    // Validate volume targets against effective guardrails
    if (data.volumeTargets) {
      const effectiveGuardrails = getEffectiveGuardrails(block.customGuardrails as any);
      const errors: string[] = [];
      for (const [muscle, sets] of Object.entries(data.volumeTargets)) {
        const guardrail = effectiveGuardrails[muscle];
        if (guardrail) {
          if (sets < guardrail.floor) errors.push(`${muscle}: minimum ${guardrail.floor} sets`);
          if (sets > guardrail.ceiling) errors.push(`${muscle}: maximum ${guardrail.ceiling} sets`);
        }
      }
      if (errors.length > 0) {
        res.status(400).json({ error: 'Volume out of range', details: errors });
        return;
      }
    }

    const updateData: any = {};
    const structureChanged = data.splitType !== undefined || data.daysPerWeek !== undefined;

    if (data.splitType !== undefined) {
      updateData.splitType = data.splitType;
    }
    if (data.daysPerWeek !== undefined) updateData.daysPerWeek = data.daysPerWeek;
    if (data.customDays !== undefined) updateData.customDays = data.customDays;
    if (data.volumeTargets !== undefined) updateData.volumeTargets = data.volumeTargets;
    if (data.startingRir !== undefined) updateData.startingRir = data.startingRir;
    if (data.rirFloor !== undefined) updateData.rirFloor = data.rirFloor;
    if (data.rirDecrementPerWeek !== undefined) updateData.rirDecrementPerWeek = data.rirDecrementPerWeek;
    if (data.deloadRir !== undefined) updateData.deloadRir = data.deloadRir;

    if (data.lengthWeeks !== undefined) {
      updateData.lengthWeeks = data.lengthWeeks;
      // Recalculate endDate
      updateData.endDate = new Date(block.startDate.getTime() + data.lengthWeeks * 7 * 86400000);
    }

    // Changing split/days on a template training block -> clear template, set to plan
    if (structureChanged && block.templateId) {
      updateData.templateId = null;
      updateData.setupMethod = 'plan';
    }

    const updated = await prisma.trainingBlock.update({
      where: { id: block.id },
      data: updateData,
    });

    // Delete future planned sessions when split structure changes
    if (structureChanged) {
      await prisma.workoutSession.deleteMany({
        where: {
          trainingBlockId: block.id,
          status: 'planned',
          weekNumber: { gte: block.currentWeek },
        },
      });
    }

    res.json({ trainingBlock: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update training block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End active training block early
router.post('/block/active/end', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    // Delete future planned sessions
    await prisma.workoutSession.deleteMany({
      where: {
        trainingBlockId: block.id,
        status: 'planned',
      },
    });

    const updated = await prisma.trainingBlock.update({
      where: { id: block.id },
      data: { status: 'completed', endDate: new Date() },
    });

    res.json({ trainingBlock: updated });
  } catch (error) {
    console.error('End training block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active training block with sessions
router.get('/block/active', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
      include: {
        workoutSessions: {
          orderBy: [{ weekNumber: 'asc' }, { date: 'asc' }],
          include: {
            exercises: {
              orderBy: { orderIndex: 'asc' },
              include: {
                sets: { orderBy: { setNumber: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    res.json({ trainingBlock: block });
  } catch (error) {
    console.error('Get active training block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Completed sessions in the active training block (newest first)
router.get('/block/sessions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    const sessions = await prisma.workoutSession.findMany({
      where: {
        trainingBlockId: block.id,
        status: 'completed',
      },
      include: {
        exercises: {
          include: { sets: true },
        },
      },
      orderBy: [{ date: 'desc' }, { completedAt: 'desc' }],
    });

    const summaries = sessions.map((session) => {
      let totalSets = 0;
      let totalTonnageKg = 0;
      const muscleSet = new Set<string>();

      for (const exercise of session.exercises) {
        muscleSet.add(exercise.muscleGroup);
        for (const set of exercise.sets) {
          if (!set.completed || set.setType !== 'working') continue;
          totalSets += 1;
          const reps = set.actualReps ?? 0;
          const weight = Number(set.actualWeightKg ?? 0);
          totalTonnageKg += reps * weight;
        }
      }

      return {
        id: session.id,
        date: session.date,
        completedAt: session.completedAt,
        weekNumber: session.weekNumber,
        dayLabel: session.dayLabel,
        muscleGroups: Array.from(muscleSet),
        exerciseCount: session.exercises.length,
        totalSets,
        totalTonnageKg: Math.round(totalTonnageKg),
      };
    });

    res.json({ sessions: summaries });
  } catch (error) {
    console.error('Get block sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
