import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getRirForWeek } from '../services/workoutGenerator';

const router = Router();

function queryString(val: unknown): string | undefined {
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
  return undefined;
}

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

// Apply template to active training block
router.post('/templates/:id/apply', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.programTemplate.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const block = await prisma.trainingBlock.findFirst({
      where: { userId: req.userId!, status: 'active' },
    });

    if (!block) {
      res.status(404).json({ error: 'No active training block found' });
      return;
    }

    // Update training block with template info
    await prisma.trainingBlock.update({
      where: { id: block.id },
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
        trainingBlockId: block.id,
        status: 'planned',
        weekNumber: { gte: block.currentWeek },
      },
    });

    // Generate workout sessions from currentWeek onward
    for (let week = block.currentWeek; week <= block.lengthWeeks; week++) {
      const rir = getRirForWeek(week, block.lengthWeeks, block);
      const isDeload = week === block.lengthWeeks;

      for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
        const day = days[dayIdx];

        const session = await prisma.workoutSession.create({
          data: {
            trainingBlockId: block.id,
            userId: req.userId!,
            date: new Date(block.startDate.getTime() + ((week - 1) * 7 + dayIdx) * 86400000),
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
          const catalogEntry = await prisma.exerciseCatalog.findFirst({
            where: {
              name: exDef.exerciseName,
              OR: [{ isDefault: true }, { userId: req.userId! }],
            },
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

    res.json({ message: 'Template applied', trainingBlockId: block.id });
  } catch (error) {
    console.error('Apply template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
