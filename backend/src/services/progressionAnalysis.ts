/**
 * Progression Analysis Service
 *
 * For each exercise in the active training block, classifies it as
 * progressing / stalled / regressing by comparing recent sessions to
 * older sessions at matched effort (similar RIR).
 *
 * This is Signal 2 from the progress-proxy-research doc: the fastest
 * adaptation proxy the app can compute from existing training data.
 */

import prisma from '../utils/prisma';

export type ProgressionStatus = 'progressing' | 'stalled' | 'regressing';

export interface ExerciseProgression {
  catalogId: string | null;
  exerciseName: string;
  muscleGroup: string;
  status: ProgressionStatus;
  e1rmChangePercent: number;
  matchedEffortRepsDelta: number;
  sessionsAnalyzed: number;
  detail: string;
}

function computeE1rm(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

interface SessionSets {
  date: Date;
  sets: {
    actualWeightKg: number;
    actualReps: number;
    actualRir: number;
  }[];
}

/**
 * Group completed exercise sets into per-session buckets, sorted by date ascending.
 */
async function getExerciseSessions(
  userId: string,
  blockId: string,
  exerciseName: string,
  catalogId: string | null,
): Promise<SessionSets[]> {
  const whereClause: any = {
    workoutSession: {
      trainingBlockId: blockId,
      userId,
      completedAt: { not: null },
    },
  };
  if (catalogId) {
    whereClause.catalogId = catalogId;
  } else {
    whereClause.exerciseName = exerciseName;
  }

  const exercises = await prisma.exercise.findMany({
    where: whereClause,
    include: {
      sets: {
        where: { completed: true },
        orderBy: { setNumber: 'asc' },
      },
      workoutSession: { select: { completedAt: true } },
    },
    orderBy: { workoutSession: { completedAt: 'asc' } },
  });

  const sessions: SessionSets[] = [];
  for (const ex of exercises) {
    const validSets = ex.sets
      .filter((s) => s.actualWeightKg != null && s.actualReps != null && s.actualRir != null)
      .map((s) => ({
        actualWeightKg: s.actualWeightKg as number,
        actualReps: s.actualReps as number,
        actualRir: s.actualRir as number,
      }));

    if (validSets.length > 0 && ex.workoutSession.completedAt) {
      sessions.push({ date: ex.workoutSession.completedAt, sets: validSets });
    }
  }

  return sessions;
}

/**
 * Compare recent sessions to older sessions at matched effort.
 * "Matched effort" = sets at the same weight where RIR differs by at most 1.
 * Returns average reps delta (positive = progressing, negative = regressing).
 */
function computeMatchedEffortDelta(recent: SessionSets[], older: SessionSets[]): number | null {
  let totalDelta = 0;
  let matchCount = 0;

  const olderSets = older.flatMap((s) => s.sets);
  const recentSets = recent.flatMap((s) => s.sets);

  for (const rs of recentSets) {
    const match = olderSets.find(
      (os) =>
        os.actualWeightKg === rs.actualWeightKg &&
        Math.abs(os.actualRir - rs.actualRir) <= 1
    );
    if (match) {
      totalDelta += rs.actualReps - match.actualReps;
      matchCount++;
    }
  }

  if (matchCount === 0) return null;
  return totalDelta / matchCount;
}

/**
 * Compute average e1RM across a set of sessions (best set per session).
 */
function avgE1rm(sessions: SessionSets[]): number {
  if (sessions.length === 0) return 0;
  let total = 0;
  for (const session of sessions) {
    let bestE1rm = 0;
    for (const set of session.sets) {
      const e1rm = computeE1rm(set.actualWeightKg, set.actualReps);
      if (e1rm > bestE1rm) bestE1rm = e1rm;
    }
    total += bestE1rm;
  }
  return total / sessions.length;
}

/**
 * Classify a single exercise as progressing / stalled / regressing.
 */
function classifyExercise(
  sessions: SessionSets[],
): { status: ProgressionStatus; e1rmChangePercent: number; matchedEffortRepsDelta: number; detail: string } {
  const mid = Math.floor(sessions.length / 2);
  const older = sessions.slice(0, mid);
  const recent = sessions.slice(mid);

  const olderE1rm = avgE1rm(older);
  const recentE1rm = avgE1rm(recent);
  const e1rmChangePercent = olderE1rm > 0 ? ((recentE1rm - olderE1rm) / olderE1rm) * 100 : 0;

  const matchedDelta = computeMatchedEffortDelta(recent, older);
  const effectiveDelta = matchedDelta ?? 0;

  // Classification logic
  if (effectiveDelta > 0.3 || e1rmChangePercent > 2) {
    const parts: string[] = [];
    if (e1rmChangePercent > 2) parts.push(`e1RM up ${e1rmChangePercent.toFixed(1)}%`);
    if (effectiveDelta > 0.3) parts.push(`+${effectiveDelta.toFixed(1)} reps at matched effort`);
    return {
      status: 'progressing',
      e1rmChangePercent,
      matchedEffortRepsDelta: effectiveDelta,
      detail: parts.join(', '),
    };
  }

  if (effectiveDelta < -0.3 && e1rmChangePercent < -2) {
    return {
      status: 'regressing',
      e1rmChangePercent,
      matchedEffortRepsDelta: effectiveDelta,
      detail: `e1RM down ${Math.abs(e1rmChangePercent).toFixed(1)}%, ${Math.abs(effectiveDelta).toFixed(1)} fewer reps at matched effort`,
    };
  }

  return {
    status: 'stalled',
    e1rmChangePercent,
    matchedEffortRepsDelta: effectiveDelta,
    detail: 'Performance flat across recent sessions',
  };
}

/**
 * Analyze progression for all exercises in the active training block.
 * Requires at least 4 sessions per exercise to produce a classification.
 */
export async function analyzeProgression(
  userId: string,
  blockId: string,
): Promise<ExerciseProgression[]> {
  // Get distinct exercises in this block
  const exercises = await prisma.exercise.findMany({
    where: {
      workoutSession: { trainingBlockId: blockId, userId, completedAt: { not: null } },
    },
    select: {
      exerciseName: true,
      catalogId: true,
      muscleGroup: true,
    },
    distinct: ['catalogId', 'exerciseName'],
  });

  const results: ExerciseProgression[] = [];

  for (const ex of exercises) {
    const sessions = await getExerciseSessions(userId, blockId, ex.exerciseName, ex.catalogId);

    if (sessions.length < 4) continue;

    const classification = classifyExercise(sessions);

    results.push({
      catalogId: ex.catalogId,
      exerciseName: ex.exerciseName,
      muscleGroup: ex.muscleGroup || 'unknown',
      status: classification.status,
      e1rmChangePercent: Math.round(classification.e1rmChangePercent * 10) / 10,
      matchedEffortRepsDelta: Math.round(classification.matchedEffortRepsDelta * 10) / 10,
      sessionsAnalyzed: sessions.length,
      detail: classification.detail,
    });
  }

  // Sort: regressing first (most urgent), then stalled, then progressing
  const order: Record<ProgressionStatus, number> = { regressing: 0, stalled: 1, progressing: 2 };
  results.sort((a, b) => order[a.status] - order[b.status]);

  return results;
}
