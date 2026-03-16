import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  VOLUME_GUARDRAILS,
  getEffectiveGuardrails,
  getSetsForWeek,
  getRirForWeek,
  getDayLabels,
  getMuscleGroupsForDay,
  SPLIT_DEFINITIONS,
} from '../services/workoutGenerator';

const router = Router();

function queryString(val: unknown): string | undefined {
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
  return undefined;
}

// ==========================================
// EXERCISE CATALOG
// ==========================================

// List exercises (with optional filters)
router.get('/exercises', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const muscle = queryString(req.query.muscle);
    const equipment = queryString(req.query.equipment);
    const search = queryString(req.query.search);
    const movementType = queryString(req.query.movementType);

    const where: any = {};
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
router.post('/exercises', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      primaryMuscle: z.string(),
      secondaryMuscles: z.array(z.string()).default([]),
      equipment: z.string(),
      movementType: z.enum(['compound', 'isolation']),
      repRangeLow: z.number().int().min(1),
      repRangeHigh: z.number().int().min(1),
    });

    const data = schema.parse(req.body);

    const exercise = await prisma.exerciseCatalog.create({
      data: { ...data, isDefault: false },
    });

    res.status(201).json({ exercise });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create exercise error:', error);
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

// ==========================================
// PROGRAM TEMPLATES
// ==========================================

// List templates
router.get('/templates', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const splitType = queryString(req.query.splitType);
    const daysPerWeek = queryString(req.query.daysPerWeek);

    const where: any = {};
    if (splitType) where.splitType = splitType;
    if (daysPerWeek) where.daysPerWeek = parseInt(daysPerWeek);

    const templates = await prisma.programTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get template detail
router.get('/templates/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = queryString(req.params.id);
    const template = await prisma.programTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json({ template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply template to active mesocycle
router.post('/templates/:id/apply', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.programTemplate.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const mesocycle = await prisma.mesocycle.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!mesocycle) {
      res.status(404).json({ error: 'No active mesocycle found' });
      return;
    }

    // Update mesocycle with template info
    await prisma.mesocycle.update({
      where: { id: mesocycle.id },
      data: {
        setupMethod: 'template',
        templateId: template.id,
        splitType: template.splitType,
        daysPerWeek: template.daysPerWeek,
      },
    });

    // Use reordered days if provided, otherwise use template default order
    const dayOrder: number[] | undefined = req.body.dayOrder;
    const templateDays = template.days as any[];
    const days = dayOrder
      ? dayOrder.map((idx) => templateDays[idx]).filter(Boolean)
      : templateDays;

    // Delete existing planned sessions before regenerating
    await prisma.workoutSession.deleteMany({
      where: {
        mesocycleId: mesocycle.id,
        status: 'planned',
        weekNumber: { gte: mesocycle.currentWeek },
      },
    });

    // Generate workout sessions from currentWeek onward
    for (let week = mesocycle.currentWeek; week <= mesocycle.lengthWeeks; week++) {
      const rir = getRirForWeek(week, mesocycle.lengthWeeks, mesocycle);
      const isDeload = week === mesocycle.lengthWeeks;

      for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
        const day = days[dayIdx];

        const session = await prisma.workoutSession.create({
          data: {
            mesocycleId: mesocycle.id,
            userId: req.userId!,
            date: new Date(mesocycle.startDate.getTime() + ((week - 1) * 7 + dayIdx) * 86400000),
            weekNumber: week,
            dayLabel: day.dayLabel,
            status: 'planned',
          },
        });

        // Create exercises and sets
        for (let exIdx = 0; exIdx < day.exercises.length; exIdx++) {
          const exDef = day.exercises[exIdx];
          const baseSets = exDef.sets;
          const weekSets = isDeload ? Math.ceil(baseSets * 0.5) : baseSets;

          // Look up catalog entry
          const catalogEntry = await prisma.exerciseCatalog.findUnique({
            where: { name: exDef.exerciseName },
          });

          const exercise = await prisma.exercise.create({
            data: {
              workoutSessionId: session.id,
              catalogId: catalogEntry?.id || null,
              orderIndex: exIdx,
              exerciseName: exDef.exerciseName,
              muscleGroup: exDef.muscleGroup,
            },
          });

          // Create sets
          for (let s = 1; s <= weekSets; s++) {
            await prisma.exerciseSet.create({
              data: {
                exerciseId: exercise.id,
                setNumber: s,
                setType: 'working',
                targetReps: Math.round((exDef.repRangeLow + exDef.repRangeHigh) / 2),
                targetRir: rir,
              },
            });
          }
        }
      }
    }

    res.json({ message: 'Template applied', mesocycleId: mesocycle.id });
  } catch (error) {
    console.error('Apply template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// MESOCYCLE CREATION
// ==========================================

// Starting volume per muscle group by experience level
function getStartingVolume(experienceLevel: string): Record<string, number> {
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

// Create a new mesocycle
const createMesocycleSchema = z.object({
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
});

router.post('/mesocycle/create', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = createMesocycleSchema.parse(req.body);

    // End any existing active mesocycle
    await prisma.mesocycle.updateMany({
      where: { userId: req.userId!, status: 'active' },
      data: { status: 'completed', endDate: new Date() },
    });

    // Get user for experience level
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    // Count previous mesocycles
    const mesoCount = await prisma.mesocycle.count({ where: { userId: req.userId! } });

    // Use provided volume targets or default based on experience
    const volumeTargets = data.volumeTargets || getStartingVolume(user?.experienceLevel || 'intermediate');

    const mesocycle = await prisma.mesocycle.create({
      data: {
        userId: req.userId!,
        mesocycleNumber: mesoCount + 1,
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
      },
    });

    res.status(201).json({ mesocycle });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create mesocycle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// MESOCYCLE UPDATE & END
// ==========================================

// Update active mesocycle in-place
const updateMesocycleSchema = z.object({
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
});

router.put('/mesocycle/active', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateMesocycleSchema.parse(req.body);

    const mesocycle = await prisma.mesocycle.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!mesocycle) {
      res.status(404).json({ error: 'No active mesocycle found' });
      return;
    }

    // Validate lengthWeeks >= currentWeek
    if (data.lengthWeeks !== undefined && data.lengthWeeks < mesocycle.currentWeek) {
      res.status(400).json({ error: `Cannot shorten below current week (${mesocycle.currentWeek})` });
      return;
    }

    // Validate customDays required when splitType is custom
    const effectiveSplit = data.splitType ?? mesocycle.splitType;
    const effectiveDays = data.daysPerWeek ?? mesocycle.daysPerWeek;
    if (effectiveSplit === 'custom') {
      const effectiveCustomDays = data.customDays ?? (mesocycle.customDays as any[] | undefined);
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
      const effectiveGuardrails = getEffectiveGuardrails(mesocycle.customGuardrails as any);
      const errors: string[] = [];
      for (const [muscle, sets] of Object.entries(data.volumeTargets)) {
        const guardrail = effectiveGuardrails[muscle];
        if (guardrail) {
          if (sets < guardrail.mev) errors.push(`${muscle}: minimum ${guardrail.mev} sets (MEV)`);
          if (sets > guardrail.mrv) errors.push(`${muscle}: maximum ${guardrail.mrv} sets (MRV)`);
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
      // Clear customDays when switching away from custom
      if (data.splitType !== 'custom') {
        updateData.customDays = null;
      }
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
      updateData.endDate = new Date(mesocycle.startDate.getTime() + data.lengthWeeks * 7 * 86400000);
    }

    // Changing split/days on a template mesocycle → clear template, set to plan
    if (structureChanged && mesocycle.templateId) {
      updateData.templateId = null;
      updateData.setupMethod = 'plan';
    }

    const updated = await prisma.mesocycle.update({
      where: { id: mesocycle.id },
      data: updateData,
    });

    // Delete future planned sessions when split structure changes
    if (structureChanged) {
      await prisma.workoutSession.deleteMany({
        where: {
          mesocycleId: mesocycle.id,
          status: 'planned',
          weekNumber: { gte: mesocycle.currentWeek },
        },
      });
    }

    res.json({ mesocycle: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update mesocycle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End active mesocycle early
router.post('/mesocycle/active/end', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const mesocycle = await prisma.mesocycle.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!mesocycle) {
      res.status(404).json({ error: 'No active mesocycle found' });
      return;
    }

    // Delete future planned sessions
    await prisma.workoutSession.deleteMany({
      where: {
        mesocycleId: mesocycle.id,
        status: 'planned',
      },
    });

    const updated = await prisma.mesocycle.update({
      where: { id: mesocycle.id },
      data: { status: 'completed', endDate: new Date() },
    });

    res.json({ mesocycle: updated });
  } catch (error) {
    console.error('End mesocycle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// MESOCYCLE & VOLUME
// ==========================================

// Get active mesocycle with sessions
router.get('/mesocycle/active', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const mesocycle = await prisma.mesocycle.findFirst({
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

    if (!mesocycle) {
      res.status(404).json({ error: 'No active mesocycle found' });
      return;
    }

    res.json({ mesocycle });
  } catch (error) {
    console.error('Get active mesocycle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update volume targets (with MEV/MRV guardrails)
router.put('/volume-targets', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      volumeTargets: z.record(z.string(), z.number().int().min(0)),
    });

    const { volumeTargets } = schema.parse(req.body);

    const mesocycle = await prisma.mesocycle.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!mesocycle) {
      res.status(404).json({ error: 'No active mesocycle found' });
      return;
    }

    // Validate against effective guardrails
    const effectiveGuardrails = getEffectiveGuardrails(mesocycle.customGuardrails as any);
    const errors: string[] = [];
    for (const [muscle, sets] of Object.entries(volumeTargets)) {
      const guardrail = effectiveGuardrails[muscle];
      if (guardrail) {
        if (sets < guardrail.mev) {
          errors.push(`${muscle}: minimum ${guardrail.mev} sets (MEV)`);
        }
        if (sets > guardrail.mrv) {
          errors.push(`${muscle}: maximum ${guardrail.mrv} sets (MRV)`);
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ error: 'Volume out of range', details: errors });
      return;
    }

    const updated = await prisma.mesocycle.update({
      where: { id: mesocycle.id },
      data: { volumeTargets },
    });

    res.json({ mesocycle: updated, guardrails: effectiveGuardrails });
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
    const mesocycle = await prisma.mesocycle.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    const effectiveGuardrails = getEffectiveGuardrails(mesocycle?.customGuardrails as any);
    res.json({ guardrails: effectiveGuardrails, defaults: VOLUME_GUARDRAILS });
  } catch (error) {
    console.error('Get volume guardrails error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update custom volume guardrails on active mesocycle
router.put('/volume-guardrails', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      customGuardrails: z.record(
        z.string(),
        z.object({
          mev: z.number().int().min(0).optional(),
          mrv: z.number().int().min(1).optional(),
        })
      ),
    });

    const { customGuardrails } = schema.parse(req.body);

    // Validate mev < mrv for each muscle
    const errors: string[] = [];
    for (const [muscle, overrides] of Object.entries(customGuardrails)) {
      const defaults = VOLUME_GUARDRAILS[muscle];
      if (!defaults) {
        errors.push(`Unknown muscle group: ${muscle}`);
        continue;
      }
      const mev = overrides.mev ?? defaults.mev;
      const mrv = overrides.mrv ?? defaults.mrv;
      if (mev >= mrv) {
        errors.push(`${muscle}: MEV (${mev}) must be less than MRV (${mrv})`);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ error: 'Invalid guardrails', details: errors });
      return;
    }

    const mesocycle = await prisma.mesocycle.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!mesocycle) {
      res.status(404).json({ error: 'No active mesocycle found' });
      return;
    }

    // Merge with existing custom guardrails
    const existing = (mesocycle.customGuardrails as Record<string, any>) || {};
    const merged = { ...existing, ...customGuardrails };

    // Remove entries that match defaults (keep sparse)
    for (const [muscle, overrides] of Object.entries(merged)) {
      const defaults = VOLUME_GUARDRAILS[muscle];
      if (defaults &&
        (overrides.mev === undefined || overrides.mev === defaults.mev) &&
        (overrides.mrv === undefined || overrides.mrv === defaults.mrv)) {
        delete merged[muscle];
      }
    }

    const updated = await prisma.mesocycle.update({
      where: { id: mesocycle.id },
      data: { customGuardrails: Object.keys(merged).length > 0 ? merged : Prisma.DbNull },
    });

    const effectiveGuardrails = getEffectiveGuardrails(updated.customGuardrails as any);
    res.json({ mesocycle: updated, guardrails: effectiveGuardrails });
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
    const mesocycle = await prisma.mesocycle.findFirst({
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

    if (!mesocycle) {
      res.status(404).json({ error: 'No active mesocycle found' });
      return;
    }

    // Get sessions for current week
    const sessions = await prisma.workoutSession.findMany({
      where: {
        mesocycleId: mesocycle.id,
        weekNumber: mesocycle.currentWeek,
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

    const volumeTargets = mesocycle.volumeTargets as Record<string, number>;

    const effectiveGuardrails = getEffectiveGuardrails(mesocycle.customGuardrails as any);

    res.json({
      weekNumber: mesocycle.currentWeek,
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

// ==========================================
// BUILD AS YOU GO — Session creation
// ==========================================

// Get today's context (split day, muscle groups, volume status)
router.get('/today', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const mesocycle = await prisma.mesocycle.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!mesocycle) {
      res.status(404).json({ error: 'No active mesocycle found' });
      return;
    }

    // Count completed sessions this week to determine which day we're on
    const sessionsThisWeek = await prisma.workoutSession.findMany({
      where: {
        mesocycleId: mesocycle.id,
        weekNumber: mesocycle.currentWeek,
      },
      orderBy: { date: 'asc' },
    });

    const completedCount = sessionsThisWeek.filter((s) => s.status === 'completed').length;
    const dayIndex = completedCount % mesocycle.daysPerWeek;

    const customDays = mesocycle.customDays as { dayLabel: string; muscleGroups: string[] }[] | undefined;
    const dayLabels = getDayLabels(mesocycle.splitType, mesocycle.daysPerWeek, customDays);
    const rir = getRirForWeek(mesocycle.currentWeek, mesocycle.lengthWeeks, mesocycle);

    // For build-as-you-go, return all day options so user can choose
    if (mesocycle.setupMethod === 'build_as_you_go') {
      const dayOptions = dayLabels.map((label, i) => ({
        dayLabel: label,
        muscleGroups: getMuscleGroupsForDay(mesocycle.splitType, i, customDays),
      }));

      res.json({
        mesocycleId: mesocycle.id,
        weekNumber: mesocycle.currentWeek,
        dayIndex,
        dayLabel: dayLabels[dayIndex],
        dayOptions,
        suggestedMuscleGroups: getMuscleGroupsForDay(mesocycle.splitType, dayIndex, customDays),
        targetRir: rir,
        splitType: mesocycle.splitType,
        volumeTargets: mesocycle.volumeTargets,
        setupMethod: mesocycle.setupMethod,
      });
      return;
    }

    const muscleGroups = getMuscleGroupsForDay(mesocycle.splitType, dayIndex, customDays);

    res.json({
      mesocycleId: mesocycle.id,
      weekNumber: mesocycle.currentWeek,
      dayIndex,
      dayLabel: dayLabels[dayIndex],
      suggestedMuscleGroups: muscleGroups,
      targetRir: rir,
      splitType: mesocycle.splitType,
      volumeTargets: mesocycle.volumeTargets,
      setupMethod: mesocycle.setupMethod,
    });
  } catch (error) {
    console.error('Get today error:', error);
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
  })),
});

router.post('/session/create', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = createSessionSchema.parse(req.body);

    const mesocycle = await prisma.mesocycle.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!mesocycle) {
      res.status(404).json({ error: 'No active mesocycle found' });
      return;
    }

    // Set setupMethod if not yet set
    if (!mesocycle.setupMethod) {
      await prisma.mesocycle.update({
        where: { id: mesocycle.id },
        data: { setupMethod: 'build_as_you_go' },
      });
    }

    const rir = getRirForWeek(mesocycle.currentWeek, mesocycle.lengthWeeks, mesocycle);

    const session = await prisma.workoutSession.create({
      data: {
        mesocycleId: mesocycle.id,
        userId: req.userId!,
        date: new Date(new Date().toISOString().split('T')[0]),
        weekNumber: mesocycle.currentWeek,
        dayLabel: data.dayLabel,
        status: 'in_progress',
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

// ==========================================
// WORKOUT EXECUTION
// ==========================================

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
        },
      },
    });

    if (!session || session.userId !== req.userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const updated = await prisma.workoutSession.update({
      where: { id: session.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    // Summarize volume
    const volumeByMuscle: Record<string, number> = {};
    for (const exercise of session.exercises) {
      const completedSets = exercise.sets.filter((s) => s.completed).length;
      volumeByMuscle[exercise.muscleGroup] = (volumeByMuscle[exercise.muscleGroup] || 0) + completedSets;
    }

    res.json({
      session: updated,
      summary: {
        totalSets: Object.values(volumeByMuscle).reduce((a, b) => a + b, 0),
        volumeByMuscle,
      },
    });
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
    const updated = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: { sets: { orderBy: { setNumber: 'asc' } } },
        },
      },
    });

    res.json({ session: updated });
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

    const mesocycle = await prisma.mesocycle.findUnique({
      where: { id: session.mesocycleId },
    });

    const rir = mesocycle
      ? getRirForWeek(mesocycle.currentWeek, mesocycle.lengthWeeks, mesocycle)
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
    const updated = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: { sets: { orderBy: { setNumber: 'asc' } } },
        },
      },
    });

    res.status(201).json({ session: updated });
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
