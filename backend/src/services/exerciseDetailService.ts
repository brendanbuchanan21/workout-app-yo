import prisma from '../utils/prisma';

type Range = '1m' | '3m' | '6m' | '1y' | 'all';

interface SetDetail {
  setNumber: number;
  weightKg: number;
  reps: number;
  rir: number | null;
}

interface SessionDetail {
  date: string;
  e1rmKg: number;
  bestWeightKg: number;
  bestReps: number;
  totalTonnageKg: number;
  totalSets: number;
  isPR: boolean;
  sets: SetDetail[];
}

interface ExerciseDetailResult {
  exercise: {
    catalogId: string;
    exerciseName: string;
    primaryMuscle: string;
    equipment: string;
    movementType: string;
  };
  summary: {
    totalSessions: number;
    currentE1rmKg: number;
    peakE1rmKg: number;
    peakE1rmDate: string;
  };
  periodComparison: {
    startAvgE1rmKg: number;
    endAvgE1rmKg: number;
    changePercent: number;
    startAvgTonnageKg: number;
    endAvgTonnageKg: number;
    startAvgBestWeight: number;
    startAvgBestReps: number;
    endAvgBestWeight: number;
    endAvgBestReps: number;
  } | null;
  sessions: SessionDetail[];
  prs: { weightKg: number; reps: number; date: string }[];
}

function getRangeDate(range: Range): Date | null {
  if (range === 'all') return null;
  const now = new Date();
  switch (range) {
    case '1m': now.setMonth(now.getMonth() - 1); break;
    case '3m': now.setMonth(now.getMonth() - 3); break;
    case '6m': now.setMonth(now.getMonth() - 6); break;
    case '1y': now.setFullYear(now.getFullYear() - 1); break;
  }
  return now;
}

function computeE1rm(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 100) / 100;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function getExerciseDetail(
  userId: string,
  catalogId: string,
  range: Range
): Promise<ExerciseDetailResult | null> {
  const rangeDate = getRangeDate(range);

  const [catalog, sets] = await Promise.all([
    prisma.exerciseCatalog.findFirst({
      where: {
        id: catalogId,
        OR: [{ isDefault: true }, { userId }],
      },
    }),
    prisma.exerciseSet.findMany({
      where: {
        completed: true,
        actualWeightKg: { not: null },
        actualReps: { not: null },
        exercise: {
          catalogId,
          workoutSession: {
            userId,
            completedAt: { not: null },
            ...(rangeDate ? { date: { gte: rangeDate } } : {}),
          },
        },
      },
      include: {
        exercise: {
          select: {
            exerciseName: true,
            workoutSession: { select: { date: true } },
          },
        },
      },
      orderBy: {
        exercise: {
          workoutSession: { date: 'asc' },
        },
      },
    }),
  ]);

  if (!catalog) return null;

  // Group sets by session date
  const sessionMap: Record<string, {
    sets: SetDetail[];
    bestE1rm: number;
    bestWeightKg: number;
    bestReps: number;
    totalTonnage: number;
  }> = {};

  let exerciseName = catalog.name;

  for (const set of sets) {
    const date = set.exercise.workoutSession.date.toISOString().split('T')[0];
    const weight = set.actualWeightKg!;
    const reps = set.actualReps!;
    const e1rm = computeE1rm(weight, reps);
    exerciseName = set.exercise.exerciseName;

    if (!sessionMap[date]) {
      sessionMap[date] = { sets: [], bestE1rm: 0, bestWeightKg: 0, bestReps: 0, totalTonnage: 0 };
    }

    const session = sessionMap[date];
    session.sets.push({
      setNumber: set.setNumber,
      weightKg: weight,
      reps,
      rir: set.actualRir,
    });
    session.totalTonnage += weight * reps;

    if (e1rm > session.bestE1rm) {
      session.bestE1rm = e1rm;
      session.bestWeightKg = weight;
      session.bestReps = reps;
    }
  }

  const sortedDates = Object.keys(sessionMap).sort();
  if (sortedDates.length === 0) {
    return {
      exercise: {
        catalogId,
        exerciseName,
        primaryMuscle: catalog.primaryMuscle,
        equipment: catalog.equipment,
        movementType: catalog.movementType,
      },
      summary: { totalSessions: 0, currentE1rmKg: 0, peakE1rmKg: 0, peakE1rmDate: '' },
      periodComparison: null,
      sessions: [],
      prs: [],
    };
  }

  // Build sessions array with PR detection
  const sessions: SessionDetail[] = [];
  const prs: { weightKg: number; reps: number; date: string }[] = [];
  const bestRepsAtWeight: Record<number, number> = {};
  let peakE1rm = 0;
  let peakE1rmDate = '';

  for (const date of sortedDates) {
    const s = sessionMap[date];
    let isPR = false;

    // Check each set for rep PRs at that weight
    for (const set of s.sets) {
      const prev = bestRepsAtWeight[set.weightKg];
      if (prev === undefined || set.reps > prev) {
        if (prev !== undefined) {
          isPR = true;
          prs.push({ weightKg: set.weightKg, reps: set.reps, date });
        }
        bestRepsAtWeight[set.weightKg] = set.reps;
      }
    }

    if (s.bestE1rm > peakE1rm) {
      peakE1rm = s.bestE1rm;
      peakE1rmDate = date;
    }

    // Sort sets by set number
    s.sets.sort((a, b) => a.setNumber - b.setNumber);

    sessions.push({
      date,
      e1rmKg: s.bestE1rm,
      bestWeightKg: s.bestWeightKg,
      bestReps: s.bestReps,
      totalTonnageKg: Math.round(s.totalTonnage),
      totalSets: s.sets.length,
      isPR,
      sets: s.sets,
    });
  }

  const currentE1rm = sessions[sessions.length - 1].e1rmKg;

  // Period comparison: first 25% vs last 25%
  let periodComparison: ExerciseDetailResult['periodComparison'] = null;
  if (sessions.length >= 4) {
    const quarter = Math.max(1, Math.floor(sessions.length * 0.25));
    const startSlice = sessions.slice(0, quarter);
    const endSlice = sessions.slice(-quarter);

    const startAvgE1rm = avg(startSlice.map((s) => s.e1rmKg));
    const endAvgE1rm = avg(endSlice.map((s) => s.e1rmKg));

    periodComparison = {
      startAvgE1rmKg: Math.round(startAvgE1rm * 100) / 100,
      endAvgE1rmKg: Math.round(endAvgE1rm * 100) / 100,
      changePercent: startAvgE1rm > 0
        ? Math.round(((endAvgE1rm - startAvgE1rm) / startAvgE1rm) * 1000) / 10
        : 0,
      startAvgTonnageKg: Math.round(avg(startSlice.map((s) => s.totalTonnageKg))),
      endAvgTonnageKg: Math.round(avg(endSlice.map((s) => s.totalTonnageKg))),
      startAvgBestWeight: Math.round(avg(startSlice.map((s) => s.bestWeightKg)) * 100) / 100,
      startAvgBestReps: Math.round(avg(startSlice.map((s) => s.bestReps))),
      endAvgBestWeight: Math.round(avg(endSlice.map((s) => s.bestWeightKg)) * 100) / 100,
      endAvgBestReps: Math.round(avg(endSlice.map((s) => s.bestReps))),
    };
  }

  return {
    exercise: {
      catalogId,
      exerciseName,
      primaryMuscle: catalog.primaryMuscle,
      equipment: catalog.equipment,
      movementType: catalog.movementType,
    },
    summary: {
      totalSessions: sessions.length,
      currentE1rmKg: currentE1rm,
      peakE1rmKg: peakE1rm,
      peakE1rmDate,
    },
    periodComparison,
    sessions,
    prs,
  };
}
