import prisma from '../utils/prisma';
import { analyzeProgression, ExerciseProgression } from './progressionAnalysis';
import { getEffectiveGuardrails, getPhaseAdjustedGuardrails } from './workoutGenerator';

export type MuscleDevelopmentState = 'developing' | 'holding' | 'mixed' | 'low_signal';
export type MuscleDevelopmentConfidence = 'high' | 'medium' | 'low';
export type VolumeContext = 'below' | 'within' | 'above' | 'insufficient';

export interface MuscleDevelopmentSignal {
  muscle: string;
  state: MuscleDevelopmentState;
  confidence: MuscleDevelopmentConfidence;
  summary: string;
  drivers: string[];
  topExercises: Array<{
    exerciseName: string;
    status: 'progressing' | 'stalled' | 'regressing';
    confidence: 'high' | 'medium' | 'low';
    detail: string;
  }>;
  priorAvgWeeklySets: number;
  recentAvgWeeklySets: number;
  volumeContext: VolumeContext;
  sessionsTouchingMuscle: number;
}

const WINDOW_WEEKS = 8;
const PERIOD_WEEKS = 4;

function getWindowStart() {
  const now = new Date();
  const since = new Date(now);
  since.setDate(now.getDate() - (WINDOW_WEEKS * 7));
  return since;
}

function getWeekStart(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const day = normalized.getDay();
  const diff = normalized.getDate() - day + (day === 0 ? -6 : 1);
  normalized.setDate(diff);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function getWindowWeekStarts(since: Date) {
  const starts: string[] = [];
  const cursor = getWeekStart(since);
  for (let i = 0; i < WINDOW_WEEKS; i += 1) {
    const weekStart = new Date(cursor);
    weekStart.setDate(cursor.getDate() + (i * 7));
    starts.push(weekStart.toISOString().split('T')[0]);
  }
  return starts;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function formatMuscle(muscle: string) {
  return muscle.replace(/_/g, ' ');
}

function isCredibleDirectionalSignal(p: ExerciseProgression, status: 'progressing' | 'regressing') {
  if (p.status !== status) return false;
  if (p.confidence === 'low') return false;
  return p.magnitude !== 'minor';
}

function isCredibleHoldingSignal(p: ExerciseProgression) {
  return p.status === 'stalled' && p.signalBasis !== 'limited_data';
}

function confidenceFromEvidence(params: {
  usableExerciseCount: number;
  totalMatchedPairs: number;
  sessionsTouchingMuscle: number;
  volumeContext: VolumeContext;
}) {
  const {
    usableExerciseCount,
    totalMatchedPairs,
    sessionsTouchingMuscle,
    volumeContext,
  } = params;

  if (
    usableExerciseCount >= 2 &&
    totalMatchedPairs >= 4 &&
    sessionsTouchingMuscle >= 6 &&
    volumeContext === 'within'
  ) {
    return 'high' as const;
  }

  if (
    usableExerciseCount >= 1 &&
    totalMatchedPairs >= 2 &&
    sessionsTouchingMuscle >= 4
  ) {
    return 'medium' as const;
  }

  return 'low' as const;
}

function buildSummary(params: {
  state: MuscleDevelopmentState;
  muscle: string;
  hasProgress: boolean;
  hasRegression: boolean;
  volumeContext: VolumeContext;
  topProgressing?: ExerciseProgression;
  topRegressing?: ExerciseProgression;
}) {
  const {
    state,
    muscle,
    hasProgress,
    hasRegression,
    volumeContext,
    topProgressing,
    topRegressing,
  } = params;

  const muscleLabel = formatMuscle(muscle);

  if (state === 'developing') {
    const driver = topProgressing?.exerciseName
      ? `${topProgressing.exerciseName} is improving at comparable effort`
      : `comparable performance is improving`;
    const volumeCopy = volumeContext === 'within'
      ? 'recent volume is staying in a productive range'
      : 'recent exposure remains supportive';
    return `${driver} for ${muscleLabel} while ${volumeCopy}.`;
  }

  if (state === 'holding') {
    return `${muscleLabel} performance is broadly maintained, with recent exposure supporting a holding read.`;
  }

  if (state === 'mixed') {
    if (hasProgress && hasRegression && topProgressing && topRegressing) {
      return `${muscleLabel} shows mixed evidence, with ${topProgressing.exerciseName} improving while ${topRegressing.exerciseName} has softened.`;
    }
    if (hasProgress && volumeContext === 'below') {
      return `${muscleLabel} has some upward performance evidence, but recent exposure is lighter than ideal for a clean read.`;
    }
    return `${muscleLabel} shows movement, but the evidence is not coherent enough for a clean directional call.`;
  }

  return `${muscleLabel} does not have enough recent exposure for a trustworthy directional read.`;
}

function buildDrivers(params: {
  credibleProgressing: ExerciseProgression[];
  credibleStalled: ExerciseProgression[];
  credibleRegressing: ExerciseProgression[];
  volumeContext: VolumeContext;
}) {
  const {
    credibleProgressing,
    credibleStalled,
    credibleRegressing,
    volumeContext,
  } = params;

  const drivers: string[] = [];

  for (const exercise of credibleProgressing.slice(0, 2)) {
    drivers.push(`${exercise.exerciseName}: ${exercise.detail}`);
  }
  for (const exercise of credibleStalled.slice(0, 1)) {
    drivers.push(`${exercise.exerciseName}: ${exercise.detail}`);
  }
  for (const exercise of credibleRegressing.slice(0, 1)) {
    drivers.push(`${exercise.exerciseName}: ${exercise.detail}`);
  }

  if (volumeContext === 'within') drivers.push('Recent weekly volume remains within guardrails');
  if (volumeContext === 'below') drivers.push('Recent weekly volume is below the productive range');
  if (volumeContext === 'above') drivers.push('Recent weekly volume is above the usual recoverable range');

  return drivers.slice(0, 4);
}

export async function getMuscleDevelopmentSignals(userId: string) {
  const block = await prisma.trainingBlock.findFirst({
    where: { userId, status: 'active' },
  });

  if (!block) {
    return {
      range: '8w',
      analyzedWeeks: WINDOW_WEEKS,
      generatedAt: new Date().toISOString(),
      signals: [] as MuscleDevelopmentSignal[],
    };
  }

  const since = getWindowStart();
  const progressions = await analyzeProgression(userId, block.id, { since });

  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      trainingBlockId: block.id,
      completedAt: { not: null, gte: since },
    },
    include: {
      exercises: {
        include: {
          sets: {
            where: { completed: true, setType: 'working' },
          },
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  const weekStarts = getWindowWeekStarts(since);
  const weeklyVolume: Record<string, Record<string, number>> = {};
  const sessionsTouchingMuscle: Record<string, Set<string>> = {};

  for (const week of weekStarts) weeklyVolume[week] = {};

  for (const session of sessions) {
    const sessionKey = session.id;
    const weekKey = getWeekStart(new Date(session.date)).toISOString().split('T')[0];
    if (!weeklyVolume[weekKey]) weeklyVolume[weekKey] = {};

    const touchedMuscles = new Set<string>();

    for (const exercise of session.exercises) {
      const muscle = exercise.muscleGroup || 'unknown';
      const setCount = exercise.sets.length;
      if (setCount === 0) continue;

      weeklyVolume[weekKey][muscle] = (weeklyVolume[weekKey][muscle] || 0) + setCount;
      touchedMuscles.add(muscle);
    }

    for (const muscle of touchedMuscles) {
      if (!sessionsTouchingMuscle[muscle]) sessionsTouchingMuscle[muscle] = new Set<string>();
      sessionsTouchingMuscle[muscle].add(sessionKey);
    }
  }

  const baseGuardrails = getEffectiveGuardrails(block.customGuardrails as any);
  const guardrails = getPhaseAdjustedGuardrails(baseGuardrails, block.phaseIntent ?? null);

  const muscles = new Set<string>([
    ...Object.keys(guardrails),
    ...progressions.map((p) => p.muscleGroup || 'unknown'),
    ...Object.keys(sessionsTouchingMuscle),
  ]);

  const signals: MuscleDevelopmentSignal[] = [];

  for (const muscle of muscles) {
    const exerciseSignals = progressions
      .filter((p) => p.muscleGroup === muscle)
      .sort((a, b) => {
        const confidenceOrder = { high: 0, medium: 1, low: 2 };
        return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
      });

    const credibleProgressing = exerciseSignals.filter((p) => isCredibleDirectionalSignal(p, 'progressing'));
    const credibleRegressing = exerciseSignals.filter((p) => isCredibleDirectionalSignal(p, 'regressing'));
    const credibleStalled = exerciseSignals.filter(isCredibleHoldingSignal);

    const totalMatchedPairs = exerciseSignals.reduce((sum, p) => sum + p.matchedEffortPairs, 0);
    const touchingSessions = sessionsTouchingMuscle[muscle]?.size ?? 0;

    const muscleWeekly = weekStarts.map((weekKey) => weeklyVolume[weekKey]?.[muscle] || 0);
    const priorAvgWeeklySets = round1(
      muscleWeekly.slice(0, PERIOD_WEEKS).reduce((sum, value) => sum + value, 0) / PERIOD_WEEKS,
    );
    const recentAvgWeeklySets = round1(
      muscleWeekly.slice(PERIOD_WEEKS).reduce((sum, value) => sum + value, 0) / PERIOD_WEEKS,
    );

    const guardrail = guardrails[muscle];
    const volumeContext: VolumeContext = !guardrail
      ? 'insufficient'
      : recentAvgWeeklySets < guardrail.floor
        ? 'below'
        : recentAvgWeeklySets > guardrail.ceiling
          ? 'above'
          : 'within';

    const exposureSufficient = (
      touchingSessions >= 6
      || exerciseSignals.length >= 2
      || (exerciseSignals.length >= 1 && totalMatchedPairs >= 2 && volumeContext !== 'below')
    );

    let state: MuscleDevelopmentState = 'low_signal';

    if (!exposureSufficient || exerciseSignals.length === 0) {
      state = 'low_signal';
    } else if (credibleProgressing.length > 0 && credibleRegressing.length === 0 && volumeContext !== 'below') {
      state = 'developing';
    } else if (credibleProgressing.length === 0 && credibleRegressing.length === 0 && credibleStalled.length > 0) {
      state = 'holding';
    } else {
      state = 'mixed';
    }

    const confidence = state === 'low_signal'
      ? 'low'
      : confidenceFromEvidence({
        usableExerciseCount: exerciseSignals.length,
        totalMatchedPairs,
        sessionsTouchingMuscle: touchingSessions,
        volumeContext,
      });

    const summary = buildSummary({
      state,
      muscle,
      hasProgress: credibleProgressing.length > 0,
      hasRegression: credibleRegressing.length > 0,
      volumeContext,
      topProgressing: credibleProgressing[0],
      topRegressing: credibleRegressing[0],
    });

    const drivers = buildDrivers({
      credibleProgressing,
      credibleStalled,
      credibleRegressing,
      volumeContext,
    });

    const topExercises = exerciseSignals.slice(0, 3).map((exercise) => ({
      exerciseName: exercise.exerciseName,
      status: exercise.status,
      confidence: exercise.confidence,
      detail: exercise.detail,
    }));

    signals.push({
      muscle,
      state,
      confidence,
      summary,
      drivers,
      topExercises,
      priorAvgWeeklySets,
      recentAvgWeeklySets,
      volumeContext,
      sessionsTouchingMuscle: touchingSessions,
    });
  }

  const stateOrder: Record<MuscleDevelopmentState, number> = {
    developing: 0,
    mixed: 1,
    holding: 2,
    low_signal: 3,
  };
  const confidenceOrder: Record<MuscleDevelopmentConfidence, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  signals.sort((a, b) => {
    if (stateOrder[a.state] !== stateOrder[b.state]) {
      return stateOrder[a.state] - stateOrder[b.state];
    }
    if (confidenceOrder[a.confidence] !== confidenceOrder[b.confidence]) {
      return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    }
    return b.sessionsTouchingMuscle - a.sessionsTouchingMuscle;
  });

  return {
    range: '8w',
    analyzedWeeks: WINDOW_WEEKS,
    generatedAt: new Date().toISOString(),
    signals,
  };
}
