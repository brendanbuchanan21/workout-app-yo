import prisma from '../utils/prisma';

interface PREvent {
  exerciseName: string;
  catalogId: string | null;
  primaryMuscle: string;
  equipment: string;
  type: 'rep';
  weightKg: number;
  reps: number;
  date: string;
  previousBest: { reps: number } | null;
}

interface EnrichedPR {
  exerciseName: string;
  catalogId: string | null;
  primaryMuscle: string;
  equipment: string;
  records: { weightKg: number; reps: number; date: string }[];
}

async function fetchCompletedSets(userId: string) {
  return prisma.exerciseSet.findMany({
    where: {
      completed: true,
      actualWeightKg: { not: null },
      actualReps: { not: null },
      exercise: {
        workoutSession: {
          userId,
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
    orderBy: {
      exercise: {
        workoutSession: { date: 'asc' },
      },
    },
  });
}

async function getCatalogMap(userId: string): Promise<Record<string, { primaryMuscle: string; equipment: string }>> {
  const catalogs = await prisma.exerciseCatalog.findMany({
    where: {
      OR: [{ isDefault: true }, { userId }],
    },
    select: { id: true, primaryMuscle: true, equipment: true },
  });
  const map: Record<string, { primaryMuscle: string; equipment: string }> = {};
  for (const c of catalogs) {
    map[c.id] = { primaryMuscle: c.primaryMuscle, equipment: c.equipment };
  }
  return map;
}

export async function computePRFeed(userId: string): Promise<PREvent[]> {
  const [sets, catalogMap] = await Promise.all([
    fetchCompletedSets(userId),
    getCatalogMap(userId),
  ]);

  // Track best reps at each weight per exercise, chronologically
  const bestAtWeight: Record<string, Record<number, number>> = {};
  const events: PREvent[] = [];

  for (const set of sets) {
    const key = set.exercise.catalogId || set.exercise.exerciseName;
    const weight = set.actualWeightKg!;
    const reps = set.actualReps!;
    const date = set.exercise.workoutSession.date.toISOString().split('T')[0];

    if (!bestAtWeight[key]) bestAtWeight[key] = {};

    const prevBest = bestAtWeight[key][weight];

    if (prevBest === undefined) {
      // First time at this weight — always a PR
      bestAtWeight[key][weight] = reps;

      const catalog = set.exercise.catalogId ? catalogMap[set.exercise.catalogId] : null;
      events.push({
        exerciseName: set.exercise.exerciseName,
        catalogId: set.exercise.catalogId,
        primaryMuscle: catalog?.primaryMuscle || set.exercise.muscleGroup,
        equipment: catalog?.equipment || 'unknown',
        type: 'rep',
        weightKg: weight,
        reps,
        date,
        previousBest: null,
      });
    } else if (reps > prevBest) {
      // Beat previous best
      events.push({
        exerciseName: set.exercise.exerciseName,
        catalogId: set.exercise.catalogId,
        primaryMuscle: catalogMap[set.exercise.catalogId!]?.primaryMuscle || set.exercise.muscleGroup,
        equipment: catalogMap[set.exercise.catalogId!]?.equipment || 'unknown',
        type: 'rep',
        weightKg: weight,
        reps,
        date,
        previousBest: { reps: prevBest },
      });
      bestAtWeight[key][weight] = reps;
    }
  }

  // Return most recent first, capped at 50
  return events.reverse().slice(0, 50);
}

export async function computeEnrichedPRs(userId: string): Promise<EnrichedPR[]> {
  const [sets, catalogMap] = await Promise.all([
    fetchCompletedSets(userId),
    getCatalogMap(userId),
  ]);

  const exerciseMap: Record<string, {
    exerciseName: string;
    catalogId: string | null;
    primaryMuscle: string;
    equipment: string;
    records: Record<number, { reps: number; date: string }>;
  }> = {};

  for (const set of sets) {
    const key = set.exercise.catalogId || set.exercise.exerciseName;
    const weight = set.actualWeightKg!;
    const reps = set.actualReps!;
    const date = set.exercise.workoutSession.date.toISOString().split('T')[0];

    if (!exerciseMap[key]) {
      const catalog = set.exercise.catalogId ? catalogMap[set.exercise.catalogId] : null;
      exerciseMap[key] = {
        exerciseName: set.exercise.exerciseName,
        catalogId: set.exercise.catalogId,
        primaryMuscle: catalog?.primaryMuscle || set.exercise.muscleGroup,
        equipment: catalog?.equipment || 'unknown',
        records: {},
      };
    }

    const existing = exerciseMap[key].records[weight];
    if (!existing || reps > existing.reps) {
      exerciseMap[key].records[weight] = { reps, date };
    }
  }

  return Object.values(exerciseMap)
    .map((ex) => ({
      exerciseName: ex.exerciseName,
      catalogId: ex.catalogId,
      primaryMuscle: ex.primaryMuscle,
      equipment: ex.equipment,
      records: Object.entries(ex.records)
        .map(([weight, data]) => ({
          weightKg: parseFloat(weight),
          reps: data.reps,
          date: data.date,
        }))
        .sort((a, b) => b.weightKg - a.weightKg),
    }))
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}
