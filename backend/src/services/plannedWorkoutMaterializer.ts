import prisma from '../utils/prisma';
import { resolveExerciseCatalogId } from './exerciseCatalogResolver';
import { getDayLabels, getRirForWeek, getSetsForWeek } from './workoutGenerator';

type CustomDay = { dayLabel: string; muscleGroups: string[] };

type BlockForMaterialization = {
  id: string;
  userId: string;
  startDate: Date;
  lengthWeeks: number;
  currentWeek: number;
  splitType: string;
  daysPerWeek: number;
  customDays: unknown;
  setupMethod: string | null;
  volumeTargets: unknown;
  startingRir?: number;
  rirFloor?: number;
  rirDecrementPerWeek?: number;
  deloadRir?: number;
};

export type ProgramExerciseDefinition = {
  catalogId?: string | null;
  exerciseName: string;
  muscleGroup: string;
  sets: number;
  repRangeLow?: number;
  repRangeHigh?: number;
};

export type ProgramDayDefinition = {
  dayLabel: string;
  exercises: ProgramExerciseDefinition[];
};

function getBlockDayLabels(block: BlockForMaterialization): string[] {
  return getDayLabels(
    block.splitType,
    block.daysPerWeek,
    block.customDays as CustomDay[] | undefined,
  );
}

function getSessionDate(block: BlockForMaterialization, week: number, dayIdx: number): Date {
  return new Date(block.startDate.getTime() + ((week - 1) * 7 + dayIdx) * 86400000);
}

function buildRepRange(def: ProgramExerciseDefinition): { repRangeLow: number; repRangeHigh: number } {
  const low = def.repRangeLow ?? 6;
  const high = def.repRangeHigh ?? 12;
  return {
    repRangeLow: Math.min(low, high),
    repRangeHigh: Math.max(low, high),
  };
}

function allocateSets(
  targetTotal: number,
  items: Array<{ key: string; baseSets: number }>,
): Record<string, number> {
  if (items.length === 0 || targetTotal <= 0) return {};

  const totalBaseSets = items.reduce((sum, item) => sum + item.baseSets, 0);
  if (totalBaseSets <= 0) return {};

  const allocations = items.map((item) => {
    const exact = (item.baseSets / totalBaseSets) * targetTotal;
    const floored = Math.floor(exact);
    return {
      key: item.key,
      floored,
      remainder: exact - floored,
    };
  });

  let remaining = targetTotal - allocations.reduce((sum, item) => sum + item.floored, 0);
  allocations.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < allocations.length && remaining > 0; i++) {
    allocations[i].floored += 1;
    remaining -= 1;
  }

  return Object.fromEntries(allocations.map((item) => [item.key, item.floored]));
}

function buildWeekDefinitions(
  dayDefinitions: ProgramDayDefinition[],
  block: BlockForMaterialization,
  weekNumber: number,
): ProgramDayDefinition[] {
  const normalizedDays = dayDefinitions.map((day) => ({
    dayLabel: day.dayLabel,
    exercises: day.exercises.map((exercise) => ({
      ...exercise,
      sets: Math.max(0, exercise.sets),
      ...buildRepRange(exercise),
    })),
  }));

  const exercisesByMuscle = new Map<
    string,
    Array<{ key: string; dayLabel: string; exercise: ProgramExerciseDefinition }>
  >();

  for (const day of normalizedDays) {
    day.exercises.forEach((exercise, index) => {
      const entry = {
        key: `${day.dayLabel}:${index}`,
        dayLabel: day.dayLabel,
        exercise,
      };
      const list = exercisesByMuscle.get(exercise.muscleGroup) ?? [];
      list.push(entry);
      exercisesByMuscle.set(exercise.muscleGroup, list);
    });
  }

  const allocatedSets = new Map<string, number>();
  const volumeTargets = (block.volumeTargets as Record<string, number> | null) ?? {};

  for (const [muscleGroup, exercises] of exercisesByMuscle.entries()) {
    const baseWeeklySets = exercises.reduce((sum, item) => sum + item.exercise.sets, 0);
    const startingWeeklySets = volumeTargets[muscleGroup] ?? baseWeeklySets;
    const targetWeeklySets = getSetsForWeek(startingWeeklySets, weekNumber, block.lengthWeeks);
    const distribution = allocateSets(
      targetWeeklySets,
      exercises.map((item) => ({ key: item.key, baseSets: item.exercise.sets })),
    );

    Object.entries(distribution).forEach(([key, sets]) => allocatedSets.set(key, sets));
  }

  return normalizedDays.map((day) => ({
    dayLabel: day.dayLabel,
    exercises: day.exercises
      .map((exercise, index) => ({
        ...exercise,
        sets: allocatedSets.get(`${day.dayLabel}:${index}`) ?? 0,
      }))
      .filter((exercise) => exercise.sets > 0),
  }));
}

async function replaceSessionExercises(
  userId: string,
  sessionId: string,
  exercises: ProgramExerciseDefinition[],
  targetRir: number,
) {
  await prisma.exercise.deleteMany({
    where: { workoutSessionId: sessionId },
  });

  for (let index = 0; index < exercises.length; index++) {
    const exerciseDef = exercises[index];
    const { repRangeLow, repRangeHigh } = buildRepRange(exerciseDef);
    const targetReps = Math.round((repRangeLow + repRangeHigh) / 2);
    const catalogId = await resolveExerciseCatalogId({
      userId,
      exerciseName: exerciseDef.exerciseName,
      catalogId: exerciseDef.catalogId,
    });

    const exercise = await prisma.exercise.create({
      data: {
        workoutSessionId: sessionId,
        catalogId,
        orderIndex: index,
        exerciseName: exerciseDef.exerciseName,
        muscleGroup: exerciseDef.muscleGroup,
      },
    });

    for (let setNumber = 1; setNumber <= exerciseDef.sets; setNumber++) {
      await prisma.exerciseSet.create({
        data: {
          exerciseId: exercise.id,
          setNumber,
          setType: 'working',
          targetReps,
          targetRir,
        },
      });
    }
  }
}

export async function getProgramDayDefinitionsFromSessions(
  block: BlockForMaterialization,
  requestedDayLabels?: string[],
): Promise<ProgramDayDefinition[]> {
  const dayLabels = requestedDayLabels ?? getBlockDayLabels(block);
  const definitions: ProgramDayDefinition[] = [];

  for (const dayLabel of dayLabels) {
    let sourceSession = await prisma.workoutSession.findFirst({
      where: {
        trainingBlockId: block.id,
        dayLabel,
        weekNumber: { gte: block.currentWeek },
        status: { in: ['planned', 'in_progress'] },
        exercises: { some: {} },
      },
      orderBy: [{ weekNumber: 'asc' }, { date: 'asc' }],
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: { sets: { orderBy: { setNumber: 'asc' } } },
        },
      },
    });

    if (!sourceSession) {
      sourceSession = await prisma.workoutSession.findFirst({
        where: {
          trainingBlockId: block.id,
          dayLabel,
          completedAt: { not: null },
          exercises: { some: {} },
        },
        orderBy: [{ completedAt: 'desc' }, { date: 'desc' }],
        include: {
          exercises: {
            orderBy: { orderIndex: 'asc' },
            include: { sets: { orderBy: { setNumber: 'asc' } } },
          },
        },
      });
    }

    if (!sourceSession) continue;

    definitions.push({
      dayLabel,
      exercises: sourceSession.exercises.map((exercise) => {
        const repTargets = exercise.sets
          .map((set) => set.targetReps)
          .filter((value): value is number => value != null);

        return {
          catalogId: exercise.catalogId,
          exerciseName: exercise.exerciseName,
          muscleGroup: exercise.muscleGroup,
          sets: exercise.sets.filter((set) => set.setType === 'working').length,
          repRangeLow: repTargets.length > 0 ? Math.min(...repTargets) : 6,
          repRangeHigh: repTargets.length > 0 ? Math.max(...repTargets) : 12,
        };
      }),
    });
  }

  return definitions;
}

export async function materializeFuturePlannedSessions(
  block: BlockForMaterialization,
  options?: {
    dayDefinitions?: ProgramDayDefinition[];
    dayLabels?: string[];
    fromWeek?: number;
    toWeek?: number;
  },
) {
  if (block.setupMethod === 'build_as_you_go') return { sessionsUpdated: 0 };

  const dayLabels = options?.dayLabels ?? getBlockDayLabels(block);
  const fromWeek = options?.fromWeek ?? block.currentWeek;
  const toWeek = options?.toWeek ?? block.lengthWeeks;
  const sourceDefinitions = options?.dayDefinitions
    ?? await getProgramDayDefinitionsFromSessions(block, dayLabels);
  const definitionsByDay = new Map(sourceDefinitions.map((definition) => [definition.dayLabel, definition]));

  const existingSessions = await prisma.workoutSession.findMany({
    where: {
      trainingBlockId: block.id,
      weekNumber: { gte: fromWeek, lte: toWeek },
      dayLabel: { in: dayLabels },
    },
    select: {
      id: true,
      weekNumber: true,
      dayLabel: true,
      status: true,
    },
  });

  const sessionsBySlot = new Map(
    existingSessions.map((session) => [`${session.weekNumber}:${session.dayLabel}`, session]),
  );

  let sessionsUpdated = 0;
  for (let weekNumber = fromWeek; weekNumber <= toWeek; weekNumber++) {
    const weekDefinitions = buildWeekDefinitions(sourceDefinitions, block, weekNumber);
    const weekDefinitionsByDay = new Map(weekDefinitions.map((definition) => [definition.dayLabel, definition]));

    for (let dayIdx = 0; dayIdx < dayLabels.length; dayIdx++) {
      const dayLabel = dayLabels[dayIdx];
      const definition = weekDefinitionsByDay.get(dayLabel) ?? definitionsByDay.get(dayLabel);

      const slotKey = `${weekNumber}:${dayLabel}`;
      const existing = sessionsBySlot.get(slotKey);
      let sessionId = existing?.id;

      if (!existing) {
        const created = await prisma.workoutSession.create({
          data: {
            trainingBlockId: block.id,
            userId: block.userId,
            date: getSessionDate(block, weekNumber, dayIdx),
            weekNumber,
            dayLabel,
            status: 'planned',
          },
          select: { id: true, weekNumber: true, dayLabel: true, status: true },
        });
        sessionId = created.id;
        sessionsBySlot.set(slotKey, created);
      } else if (existing.status !== 'planned') {
        continue;
      } else {
        await prisma.workoutSession.update({
          where: { id: existing.id },
          data: { date: getSessionDate(block, weekNumber, dayIdx) },
        });
      }

      if (!sessionId) continue;

      const targetRir = getRirForWeek(weekNumber, block.lengthWeeks, block);
      await replaceSessionExercises(block.userId, sessionId, definition?.exercises ?? [], targetRir);
      sessionsUpdated += 1;
    }
  }

  return { sessionsUpdated };
}
