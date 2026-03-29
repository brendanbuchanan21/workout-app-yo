import { PrismaClient } from '@prisma/client';

interface SessionExercise {
  catalogId: string | null;
  exerciseName: string;
  muscleGroup: string;
  sets: {
    completed: boolean;
    actualWeightKg: number | null;
    actualReps: number | null;
  }[];
}

interface SessionWithExercises {
  id: string;
  trainingBlockId: string;
  startedAt: Date | null;
  createdAt: Date;
  exercises: SessionExercise[];
}

interface PR {
  exerciseName: string;
  weightKg: number;
  reps: number;
  previousBestReps: number | null;
}

interface ExerciseBest {
  exerciseName: string;
  weight: number;
  reps: number | null;
}

interface BlockComparison {
  sessionTonnages: { date: string; tonnage: number }[];
  totalBlockSets: number;
  sessionsCompleted: number;
}

export interface WorkoutSummaryData {
  totalSets: number;
  volumeByMuscle: Record<string, number>;
  tonnage: number;
  durationSeconds: number;
  completionRate: number;
  prs: PR[];
  perExerciseBest: ExerciseBest[];
  blockComparison: BlockComparison;
}

export async function computeWorkoutSummary(
  session: SessionWithExercises,
  userId: string,
  prisma: PrismaClient,
  completedAt: Date
): Promise<WorkoutSummaryData> {
  // Summarize volume by muscle
  const volumeByMuscle: Record<string, number> = {};
  for (const exercise of session.exercises) {
    const completedSets = exercise.sets.filter((s) => s.completed).length;
    volumeByMuscle[exercise.muscleGroup] = (volumeByMuscle[exercise.muscleGroup] || 0) + completedSets;
  }

  const totalSets = Object.values(volumeByMuscle).reduce((a, b) => a + b, 0);
  const totalPlannedSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  // Tonnage: sum of actualWeightKg * actualReps for all completed sets
  let tonnage = 0;
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      if (set.completed && set.actualWeightKg != null && set.actualReps != null) {
        tonnage += set.actualWeightKg * set.actualReps;
      }
    }
  }

  // PRs: check each completed set for rep PRs at its weight
  const prs: PR[] = [];

  for (const exercise of session.exercises) {
    if (!exercise.catalogId) continue;

    for (const set of exercise.sets) {
      if (!set.completed || set.actualWeightKg == null || set.actualReps == null) continue;

      // Find previous best reps at this exact weight for this exercise
      const previousBest = await prisma.exerciseSet.findFirst({
        where: {
          exercise: {
            catalogId: exercise.catalogId,
            workoutSession: {
              userId,
              completedAt: { not: null },
              id: { not: session.id },
            },
          },
          completed: true,
          actualWeightKg: set.actualWeightKg,
          actualReps: { not: null },
        },
        orderBy: { actualReps: 'desc' },
        select: { actualReps: true },
      });

      const prevReps = previousBest?.actualReps ?? null;
      if (prevReps === null || set.actualReps > prevReps) {
        // Avoid duplicate PRs for same exercise+weight (keep best reps from this session)
        const existingIdx = prs.findIndex(
          (p) => p.exerciseName === exercise.exerciseName && p.weightKg === set.actualWeightKg
        );
        if (existingIdx >= 0) {
          if (set.actualReps > prs[existingIdx].reps) {
            prs[existingIdx].reps = set.actualReps;
          }
        } else {
          prs.push({
            exerciseName: exercise.exerciseName,
            weightKg: set.actualWeightKg,
            reps: set.actualReps,
            previousBestReps: prevReps,
          });
        }
      }
    }
  }

  // Per-exercise best set
  const perExerciseBest: ExerciseBest[] = [];
  for (const exercise of session.exercises) {
    let bestSet: { weight: number; reps: number | null } | null = null;
    for (const set of exercise.sets) {
      if (set.completed && set.actualWeightKg != null) {
        if (!bestSet || set.actualWeightKg > bestSet.weight) {
          bestSet = { weight: set.actualWeightKg, reps: set.actualReps };
        }
      }
    }
    if (bestSet) {
      perExerciseBest.push({ exerciseName: exercise.exerciseName, ...bestSet });
    }
  }

  // Duration: completedAt - startedAt (fall back to createdAt for old sessions)
  const startTime = session.startedAt || session.createdAt;
  const durationSeconds = Math.round((completedAt.getTime() - startTime.getTime()) / 1000);

  // Completion rate
  const completionRate = totalPlannedSets > 0 ? totalSets / totalPlannedSets : 0;

  // Block comparison: all completed sessions in this training block
  const blockSessions = await prisma.workoutSession.findMany({
    where: {
      trainingBlockId: session.trainingBlockId,
      completedAt: { not: null },
    },
    include: {
      exercises: {
        include: { sets: true },
      },
    },
    orderBy: { date: 'asc' },
  });

  const sessionTonnages: { date: string; tonnage: number }[] = [];
  let totalBlockSets = 0;
  for (const bs of blockSessions) {
    let bsTonnage = 0;
    for (const ex of bs.exercises) {
      for (const set of ex.sets) {
        if (set.completed) {
          totalBlockSets++;
          if (set.actualWeightKg != null && set.actualReps != null) {
            bsTonnage += set.actualWeightKg * set.actualReps;
          }
        }
      }
    }
    sessionTonnages.push({
      date: bs.date.toISOString().split('T')[0],
      tonnage: bsTonnage,
    });
  }

  return {
    totalSets,
    volumeByMuscle,
    tonnage,
    durationSeconds,
    completionRate,
    prs,
    perExerciseBest,
    blockComparison: {
      sessionTonnages,
      totalBlockSets,
      sessionsCompleted: blockSessions.length,
    },
  };
}
