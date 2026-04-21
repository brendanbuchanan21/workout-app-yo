/**
 * Recommendation Engine
 *
 * Consumes Signal 1 (volume vs guardrails), Signal 2 (matched-effort
 * progression), and the declared phase intent. Applies the cross-signal
 * decision matrix from progress-proxy-research.md Section 7.4 to emit
 * prioritized, phase-dependent action recommendations.
 */

import prisma from '../utils/prisma';
import { analyzeProgression } from './progressionAnalysis';
import { getEffectiveGuardrails, getPhaseAdjustedGuardrails } from './workoutGenerator';

export type RecommendationPriority = 'high' | 'medium' | 'low';
export type RecommendationCategory = 'volume' | 'progression' | 'deload' | 'phase';

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  detail: string;
}

interface VolumeStatus {
  muscle: string;
  currentSets: number;
  floor: number;
  ceiling: number;
  status: 'below' | 'within' | 'above';
}

/**
 * Compute current-week volume per muscle vs phase-adjusted guardrails.
 */
async function getVolumeStatuses(
  userId: string,
  blockId: string,
  currentWeek: number,
  phaseIntent: string | null,
  customGuardrails: any,
): Promise<VolumeStatus[]> {
  const base = getEffectiveGuardrails(customGuardrails);
  const guardrails = getPhaseAdjustedGuardrails(base, phaseIntent);

  const sessions = await prisma.workoutSession.findMany({
    where: {
      trainingBlockId: blockId,
      userId,
      completedAt: { not: null },
      weekNumber: currentWeek,
    },
    include: {
      exercises: {
        include: { sets: { where: { completed: true, setType: 'working' } } },
      },
    },
  });

  const muscleSets: Record<string, number> = {};
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const muscle = exercise.muscleGroup || 'unknown';
      muscleSets[muscle] = (muscleSets[muscle] || 0) + exercise.sets.length;
    }
  }

  const statuses: VolumeStatus[] = [];
  for (const [muscle, g] of Object.entries(guardrails)) {
    const current = muscleSets[muscle] || 0;
    let status: 'below' | 'within' | 'above' = 'within';
    if (current < g.floor) status = 'below';
    else if (current > g.ceiling) status = 'above';
    statuses.push({ muscle, currentSets: current, floor: g.floor, ceiling: g.ceiling, status });
  }

  return statuses;
}

function formatMuscle(m: string): string {
  return m.replace(/_/g, ' ');
}

function formatExerciseList(names: string[]): string {
  return names.join(', ');
}

function isCredibleProgressionSignal(
  p: Awaited<ReturnType<typeof analyzeProgression>>[number],
  status: 'progressing' | 'stalled' | 'regressing',
) {
  if (p.status !== status) return false;
  if (p.confidence === 'low') return false;

  if (status === 'regressing' || status === 'progressing') {
    return p.magnitude !== 'minor';
  }

  return p.signalBasis !== 'limited_data';
}

/**
 * Generate phase-dependent recommendations from the cross-signal matrix.
 */
export async function generateRecommendations(userId: string): Promise<Recommendation[]> {
  const block = await prisma.trainingBlock.findFirst({
    where: { userId, status: 'active' },
  });

  if (!block) return [];

  const phase = block.phaseIntent || 'bulk';
  const progressions = await analyzeProgression(userId, block.id);
  const volumeStatuses = await getVolumeStatuses(
    userId,
    block.id,
    block.currentWeek,
    phase,
    block.customGuardrails
  );

  const recs: Recommendation[] = [];

  // --- Volume-based recommendations ---
  const belowFloor = volumeStatuses.filter((v) => v.status === 'below');
  const aboveCeiling = volumeStatuses.filter((v) => v.status === 'above');

  if (belowFloor.length > 0) {
    const muscles = belowFloor.map((v) => formatMuscle(v.muscle)).join(', ');
    recs.push({
      id: 'volume-below-floor',
      category: 'volume',
      priority: 'high',
      title: 'Volume below target',
      detail: `${muscles}: current working-set volume is below the productive range for this week. Common reasons include missed sessions, trimmed exercise slots, or day definitions that are too light.`,
    });
  }

  if (aboveCeiling.length > 0) {
    const muscles = aboveCeiling.map((v) => formatMuscle(v.muscle)).join(', ');
    recs.push({
      id: 'volume-above-ceiling',
      category: 'volume',
      priority: 'high',
      title: phase === 'cut' ? 'Too much volume for a cut' : 'Volume above ceiling',
      detail: phase === 'cut'
        ? `${muscles}: current working-set volume is high for a deficit phase. Common explanations include trying to hold onto bulk-style volume while recovery capacity is lower.`
        : `${muscles}: current working-set volume is above the usual recoverable range. Common explanations include accumulated fatigue or volume that has drifted up faster than recovery can support.`,
    });
  }

  // --- Progression-based recommendations (phase-dependent) ---
  const regressing = progressions.filter((p) => p.status === 'regressing');
  const stalled = progressions.filter((p) => p.status === 'stalled');
  const progressing = progressions.filter((p) => p.status === 'progressing');
  const credibleRegressing = progressions.filter((p) => isCredibleProgressionSignal(p, 'regressing'));
  const credibleStalled = progressions.filter((p) => isCredibleProgressionSignal(p, 'stalled'));
  const credibleProgressing = progressions.filter((p) => isCredibleProgressionSignal(p, 'progressing'));

  if (phase === 'cut') {
    // Cut-specific logic
    if (credibleRegressing.length >= 3) {
      const names = formatExerciseList(credibleRegressing.map((p) => p.exerciseName));
      recs.push({
        id: 'cut-rapid-regression',
        category: 'phase',
        priority: 'high',
        title: 'Strength dropping across multiple exercises',
        detail: `${names}: performance is trending down across multiple exercises during this cut. Common reasons include a deficit that is too aggressive, low recovery capacity, or too much volume for the current phase.`,
      });
    } else if (regressing.length > 0) {
      const names = formatExerciseList(regressing.map((p) => p.exerciseName));
      recs.push({
        id: 'cut-some-regression',
        category: 'progression',
        priority: 'medium',
        title: 'Some strength loss during cut',
        detail: `${names}: some performance drift is showing up, which can happen in a cut. If it persists, common reasons include fatigue, a more aggressive deficit, or volume falling too low to maintain performance.`,
      });
    }

    if (credibleStalled.length > 0 && regressing.length === 0) {
      recs.push({
        id: 'cut-maintaining',
        category: 'phase',
        priority: 'low',
        title: 'Preserving strength during cut',
        detail: 'Performance is holding steady across comparable work. That is usually a good sign during a cut, where maintaining output matters more than pushing progression hard.',
      });
    }
  } else if (phase === 'maintain') {
    if (credibleRegressing.length >= 3) {
      const names = formatExerciseList(credibleRegressing.map((p) => p.exerciseName));
      recs.push({
        id: 'maintain-system-regression',
        category: 'progression',
        priority: 'high',
        title: 'Performance is trending down in several places',
        detail: `${names}: several exercises are showing credible regression. Common reasons include accumulated fatigue, inconsistent recovery, or a plan that is no longer matching your current setup well.`,
      });
    } else if (credibleRegressing.length > 0) {
      const names = formatExerciseList(credibleRegressing.map((p) => p.exerciseName));
      recs.push({
        id: 'maintain-some-regression',
        category: 'progression',
        priority: 'medium',
        title: 'A few exercises are slipping',
        detail: `${names}: performance has softened on a few exercises. Common reasons include fatigue, inconsistent effort, or exercise selections that may need a closer look.`,
      });
    }

    if (credibleStalled.length >= 3 && credibleRegressing.length === 0) {
      const names = formatExerciseList(credibleStalled.map((p) => p.exerciseName));
      recs.push({
        id: 'maintain-widespread-stall',
        category: 'progression',
        priority: 'medium',
        title: 'Several exercises are flat',
        detail: `${names}: performance has been mostly steady rather than trending up. Common reasons include low novelty, fatigue hiding progress, or a plan that may simply be in a holding pattern right now.`,
      });
    }
  } else {
    // Bulk logic
    if (credibleRegressing.length >= 3) {
      const names = formatExerciseList(credibleRegressing.map((p) => p.exerciseName));
      recs.push({
        id: 'bulk-system-regression',
        category: 'progression',
        priority: 'high',
        title: 'Multiple exercises regressing',
        detail: `${names}: performance is trending down across multiple exercises. Common reasons include accumulated fatigue, recovery outside the gym, or a setup that is no longer fitting well.`,
      });
    } else if (credibleRegressing.length > 0) {
      const names = formatExerciseList(credibleRegressing.map((p) => p.exerciseName));
      recs.push({
        id: 'bulk-some-regression',
        category: 'progression',
        priority: 'medium',
        title: 'A few exercises are trending down',
        detail: `${names}: performance is slipping on a few exercises. Common reasons include fatigue accumulation, poor session quality, or variations that may not be fitting well anymore.`,
      });
    }

    if (credibleStalled.length > 0 && credibleRegressing.length === 0) {
      if (credibleStalled.length >= 3) {
        const names = formatExerciseList(credibleStalled.map((p) => p.exerciseName));
        recs.push({
          id: 'bulk-widespread-stall',
          category: 'progression',
          priority: 'medium',
          title: 'Several exercises are flat',
          detail: `${names}: performance has been mostly flat across several exercises. Common reasons include stimulus that is no longer changing enough, fatigue masking progress, or exercises that may need a closer look.`,
        });
      } else {
        const names = formatExerciseList(credibleStalled.map((p) => p.exerciseName));
        recs.push({
          id: 'bulk-stalled',
          category: 'progression',
          priority: 'medium',
          title: 'Exercises stalled',
          detail: `${names}: recent performance has been mostly flat. Common reasons include insufficient change in stimulus, fatigue hiding adaptation, or an exercise variation that may be due for review.`,
        });
      }
    }

    if (credibleProgressing.length > 0 && credibleRegressing.length === 0 && credibleStalled.length === 0) {
      recs.push({
        id: 'bulk-on-track',
        category: 'progression',
        priority: 'low',
        title: 'Everything is progressing',
        detail: 'Comparable performance is trending up across your current exercises. The current plan appears to be working well for this phase.',
      });
    }
  }

  // Sort by priority
  const priorityOrder: Record<RecommendationPriority, number> = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recs.slice(0, 5);
}
