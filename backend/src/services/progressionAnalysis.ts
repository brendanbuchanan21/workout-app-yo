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
export type ProgressionMagnitude = 'minor' | 'moderate' | 'strong';
export type ProgressionConfidence = 'low' | 'medium' | 'high';
export type ProgressionSignalBasis = 'matched_effort' | 'e1rm_fallback' | 'mixed' | 'limited_data';

export interface ExerciseProgression {
  catalogId: string | null;
  exerciseName: string;
  muscleGroup: string;
  status: ProgressionStatus;
  magnitude: ProgressionMagnitude;
  confidence: ProgressionConfidence;
  signalBasis: ProgressionSignalBasis;
  e1rmChangePercent: number;
  matchedEffortRepsDelta: number;
  matchedEffortPairs: number;
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
    actualRir: number | null;
  }[];
}

// --- Matched-effort thresholds ---
// Matched-effort is the primary hypertrophy proxy, so keep effort matching fairly tight.
// Sets are considered comparable when they are logged within about 1 RIR of each other.
const MATCH_RIR_BAND = 1;

// Require at least 2 matched set pairs before we treat the matched-effort signal as reliable.
// A single matched pair is too noisy to confidently label an exercise progressing or regressing.
const MIN_MATCHED_PAIRS = 2;

// Average rep change needed to count as a real matched-effort shift instead of normal logging noise.
// Example: +0.1 reps on average should not flip an exercise to progressing.
const MATCH_REP_DELTA_THRESHOLD = 0.3;

// --- e1RM companion thresholds ---
// e1RM is only companion context, so use a low threshold when it is merely confirming a matched-effort result.
const E1RM_CONFIRM_THRESHOLD = 1;

// If matched-effort data is sparse or missing, require a larger e1RM move before using it as fallback evidence.
const E1RM_FALLBACK_THRESHOLD = 3;

// Very large e1RM shifts can override an otherwise ambiguous picture, but only at a clearly meaningful magnitude.
const E1RM_OVERRIDE_THRESHOLD = 5;

// --- e1RM set-quality filters ---
// e1RM estimates get much noisier at high reps and soft effort, so restrict the companion signal
// to reasonably hard sets in a rep range where rep-based strength estimates are more defensible.
const E1RM_MAX_REPS = 10;
const E1RM_MAX_RIR = 3;

function getWeightToleranceKg(weightKg: number): number {
  return Math.max(2.5, weightKg * 0.05);
}

function getMagnitude(
  status: ProgressionStatus,
  matchedDelta: number | null,
  e1rmChangePercent: number | null,
): ProgressionMagnitude {
  if (status === 'stalled') return 'minor';

  const absMatched = Math.abs(matchedDelta ?? 0);
  const absE1rm = Math.abs(e1rmChangePercent ?? 0);

  if (absMatched >= 1.5 || absE1rm >= 5) return 'strong';
  if (absMatched >= 0.75 || absE1rm >= 3) return 'moderate';
  return 'minor';
}

function getSignalBasis(
  hasReliableMatchedSignal: boolean,
  matchedSupportsDirection: boolean,
  e1rmSupportsDirection: boolean,
  e1rmFallbackUsed: boolean,
): ProgressionSignalBasis {
  if (hasReliableMatchedSignal && matchedSupportsDirection && e1rmSupportsDirection) return 'mixed';
  if (hasReliableMatchedSignal && matchedSupportsDirection) return 'matched_effort';
  if (e1rmFallbackUsed) return 'e1rm_fallback';
  return 'limited_data';
}

function getConfidence(
  status: ProgressionStatus,
  signalBasis: ProgressionSignalBasis,
  matchedPairCount: number,
  e1rmChangePercent: number | null,
): ProgressionConfidence {
  const absE1rm = Math.abs(e1rmChangePercent ?? 0);

  if (signalBasis === 'mixed') {
    return matchedPairCount >= 4 ? 'high' : 'medium';
  }

  if (signalBasis === 'matched_effort') {
    if (matchedPairCount >= 4) return 'high';
    return 'medium';
  }

  if (signalBasis === 'e1rm_fallback') {
    return absE1rm >= E1RM_OVERRIDE_THRESHOLD ? 'medium' : 'low';
  }

  if (status === 'stalled' && matchedPairCount >= MIN_MATCHED_PAIRS) return 'medium';
  return 'low';
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
      .filter((s) => s.actualWeightKg != null && s.actualReps != null)
      .map((s) => ({
        actualWeightKg: s.actualWeightKg as number,
        actualReps: s.actualReps as number,
        actualRir: s.actualRir ?? null,
      }));

    if (validSets.length > 0 && ex.workoutSession.completedAt) {
      sessions.push({ date: ex.workoutSession.completedAt, sets: validSets });
    }
  }

  return sessions;
}

/**
 * Compare recent sessions to older sessions at matched effort.
 * "Matched effort" = nearest older set within a small load band where RIR differs by at most 1.
 * Returns average reps delta (positive = progressing, negative = regressing).
 */
function computeMatchedEffortDelta(
  recent: SessionSets[],
  older: SessionSets[],
): { delta: number | null; matchCount: number } {
  let totalDelta = 0;
  let matchCount = 0;

  const olderSets = older
    .flatMap((s) => s.sets)
    .filter((set) => set.actualRir != null)
    .map((set, index) => ({ ...set, index }));
  const recentSets = recent
    .flatMap((s) => s.sets)
    .filter((set) => set.actualRir != null);
  const usedOlder = new Set<number>();

  for (const rs of recentSets) {
    const toleranceKg = getWeightToleranceKg(rs.actualWeightKg);
    const candidates = olderSets
      .filter((os) => {
        if (usedOlder.has(os.index) || os.actualRir == null || rs.actualRir == null) return false;
        return (
          Math.abs(os.actualWeightKg - rs.actualWeightKg) <= toleranceKg &&
          Math.abs(os.actualRir - rs.actualRir) <= MATCH_RIR_BAND
        );
      })
      .sort((a, b) => {
        const aWeight = Math.abs(a.actualWeightKg - rs.actualWeightKg);
        const bWeight = Math.abs(b.actualWeightKg - rs.actualWeightKg);
        if (aWeight !== bWeight) return aWeight - bWeight;

        const aRir = Math.abs((a.actualRir ?? 0) - (rs.actualRir ?? 0));
        const bRir = Math.abs((b.actualRir ?? 0) - (rs.actualRir ?? 0));
        return aRir - bRir;
      });

    const match = candidates[0];
    if (match) {
      usedOlder.add(match.index);
      totalDelta += rs.actualReps - match.actualReps;
      matchCount++;
    }
  }

  if (matchCount === 0) return { delta: null, matchCount: 0 };
  return { delta: totalDelta / matchCount, matchCount };
}

/**
 * Compute average e1RM across a set of sessions using only effort-banded sets.
 * e1RM is companion context, so we ignore soft/high-rep sets where the estimate is noisier.
 */
function avgEffortBandedE1rm(sessions: SessionSets[]): { average: number | null; sessionsUsed: number } {
  let total = 0;
  let sessionsUsed = 0;

  for (const session of sessions) {
    let bestE1rm = 0;
    for (const set of session.sets.filter((s) => s.actualRir != null && s.actualRir <= E1RM_MAX_RIR && s.actualReps <= E1RM_MAX_REPS)) {
      const e1rm = computeE1rm(set.actualWeightKg, set.actualReps);
      if (e1rm > bestE1rm) bestE1rm = e1rm;
    }

    if (bestE1rm > 0) {
      total += bestE1rm;
      sessionsUsed++;
    }
  }

  if (sessionsUsed === 0) return { average: null, sessionsUsed: 0 };
  return { average: total / sessionsUsed, sessionsUsed };
}

/**
 * Classify a single exercise as progressing / stalled / regressing.
 */
function classifyExercise(
  sessions: SessionSets[],
): {
  status: ProgressionStatus;
  magnitude: ProgressionMagnitude;
  confidence: ProgressionConfidence;
  signalBasis: ProgressionSignalBasis;
  e1rmChangePercent: number;
  matchedEffortRepsDelta: number;
  matchedEffortPairs: number;
  detail: string;
} {
  const mid = Math.floor(sessions.length / 2);
  const older = sessions.slice(0, mid);
  const recent = sessions.slice(mid);

  const olderE1rm = avgEffortBandedE1rm(older);
  const recentE1rm = avgEffortBandedE1rm(recent);
  const e1rmChangePercent = olderE1rm.average && recentE1rm.average
    ? ((recentE1rm.average - olderE1rm.average) / olderE1rm.average) * 100
    : null;

  const matched = computeMatchedEffortDelta(recent, older);
  const hasReliableMatchedSignal = matched.delta != null && matched.matchCount >= MIN_MATCHED_PAIRS;

  const matchedProgressing = hasReliableMatchedSignal && matched.delta! > MATCH_REP_DELTA_THRESHOLD;
  const matchedRegressing = hasReliableMatchedSignal && matched.delta! < -MATCH_REP_DELTA_THRESHOLD;
  const e1rmSupportsProgress = e1rmChangePercent != null && e1rmChangePercent > E1RM_CONFIRM_THRESHOLD;
  const e1rmSupportsRegression = e1rmChangePercent != null && e1rmChangePercent < -E1RM_CONFIRM_THRESHOLD;
  const e1rmFallbackProgress = e1rmChangePercent != null && e1rmChangePercent > E1RM_FALLBACK_THRESHOLD;
  const e1rmFallbackRegression = e1rmChangePercent != null && e1rmChangePercent < -E1RM_FALLBACK_THRESHOLD;
  const e1rmOverrideProgress = e1rmChangePercent != null && e1rmChangePercent > E1RM_OVERRIDE_THRESHOLD;
  const e1rmOverrideRegression = e1rmChangePercent != null && e1rmChangePercent < -E1RM_OVERRIDE_THRESHOLD;

  let status: ProgressionStatus = 'stalled';
  let signalBasis: ProgressionSignalBasis = 'limited_data';

  if (
    (matchedProgressing && !e1rmOverrideRegression) ||
    (!hasReliableMatchedSignal && e1rmFallbackProgress) ||
    (!matchedProgressing && !matchedRegressing && e1rmOverrideProgress)
  ) {
    status = 'progressing';
    signalBasis = getSignalBasis(
      hasReliableMatchedSignal,
      matchedProgressing,
      e1rmSupportsProgress,
      !hasReliableMatchedSignal && (e1rmFallbackProgress || e1rmOverrideProgress),
    );
    const parts: string[] = [];
    if (matchedProgressing && matched.delta != null) {
      parts.push(`+${matched.delta.toFixed(1)} reps at matched effort`);
    } else if (!hasReliableMatchedSignal) {
      parts.push('limited matched-effort data');
    }
    if (e1rmChangePercent != null && (e1rmSupportsProgress || !hasReliableMatchedSignal || signalBasis === 'mixed')) {
      parts.push(`e1RM up ${e1rmChangePercent.toFixed(1)}%`);
    }
    return {
      status,
      magnitude: getMagnitude(status, matched.delta, e1rmChangePercent),
      confidence: getConfidence(status, signalBasis, matched.matchCount, e1rmChangePercent),
      signalBasis,
      e1rmChangePercent: e1rmChangePercent ?? 0,
      matchedEffortRepsDelta: matched.delta ?? 0,
      matchedEffortPairs: matched.matchCount,
      detail: parts.join(', '),
    };
  }

  if (
    (matchedRegressing && !e1rmOverrideProgress) ||
    (!hasReliableMatchedSignal && e1rmFallbackRegression) ||
    (!matchedProgressing && !matchedRegressing && e1rmOverrideRegression)
  ) {
    status = 'regressing';
    signalBasis = getSignalBasis(
      hasReliableMatchedSignal,
      matchedRegressing,
      e1rmSupportsRegression,
      !hasReliableMatchedSignal && (e1rmFallbackRegression || e1rmOverrideRegression),
    );
    const parts: string[] = [];
    if (matchedRegressing && matched.delta != null) {
      parts.push(`${Math.abs(matched.delta).toFixed(1)} fewer reps at matched effort`);
    } else if (!hasReliableMatchedSignal) {
      parts.push('limited matched-effort data');
    }
    if (e1rmChangePercent != null && (e1rmSupportsRegression || !hasReliableMatchedSignal || signalBasis === 'mixed')) {
      parts.push(`e1RM down ${Math.abs(e1rmChangePercent).toFixed(1)}%`);
    }
    return {
      status,
      magnitude: getMagnitude(status, matched.delta, e1rmChangePercent),
      confidence: getConfidence(status, signalBasis, matched.matchCount, e1rmChangePercent),
      signalBasis,
      e1rmChangePercent: e1rmChangePercent ?? 0,
      matchedEffortRepsDelta: matched.delta ?? 0,
      matchedEffortPairs: matched.matchCount,
      detail: parts.join(', '),
    };
  }

  const detailParts: string[] = [];
  if (hasReliableMatchedSignal && matched.delta != null) {
    detailParts.push(`matched-effort change ${matched.delta >= 0 ? '+' : ''}${matched.delta.toFixed(1)} reps`);
  } else {
    detailParts.push('insufficient matched-effort comparisons');
  }
  if (e1rmChangePercent != null) {
    detailParts.push(`e1RM ${e1rmChangePercent >= 0 ? '+' : ''}${e1rmChangePercent.toFixed(1)}%`);
  }

  return {
    status,
    magnitude: getMagnitude(status, matched.delta, e1rmChangePercent),
    confidence: getConfidence(status, signalBasis, matched.matchCount, e1rmChangePercent),
    signalBasis,
    e1rmChangePercent: e1rmChangePercent ?? 0,
    matchedEffortRepsDelta: matched.delta ?? 0,
    matchedEffortPairs: matched.matchCount,
    detail: detailParts.join(', '),
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
      magnitude: classification.magnitude,
      confidence: classification.confidence,
      signalBasis: classification.signalBasis,
      e1rmChangePercent: Math.round(classification.e1rmChangePercent * 10) / 10,
      matchedEffortRepsDelta: Math.round(classification.matchedEffortRepsDelta * 10) / 10,
      matchedEffortPairs: classification.matchedEffortPairs,
      sessionsAnalyzed: sessions.length,
      detail: classification.detail,
    });
  }

  // Sort: regressing first (most urgent), then stalled, then progressing
  const order: Record<ProgressionStatus, number> = { regressing: 0, stalled: 1, progressing: 2 };
  results.sort((a, b) => order[a.status] - order[b.status]);

  return results;
}
