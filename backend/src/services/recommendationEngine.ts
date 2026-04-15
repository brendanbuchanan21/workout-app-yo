/**
 * Recommendation Engine
 *
 * Consumes Signal 1 (volume vs guardrails), Signal 2 (matched-effort
 * progression), and the declared phase intent. Applies the cross-signal
 * decision matrix from progress-proxy-research.md Section 7.4 to emit
 * prioritized, phase-dependent action recommendations.
 */

import prisma from '../utils/prisma';
import { analyzeProgression, ExerciseProgression, ProgressionStatus } from './progressionAnalysis';
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
  phaseIntent: string | null,
  customGuardrails: any,
): Promise<VolumeStatus[]> {
  const base = getEffectiveGuardrails(customGuardrails);
  const guardrails = getPhaseAdjustedGuardrails(base, phaseIntent);

  // Get current week's completed sets per muscle
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const sessions = await prisma.workoutSession.findMany({
    where: {
      trainingBlockId: blockId,
      userId,
      completedAt: { not: null },
      date: { gte: weekStart },
    },
    include: {
      exercises: {
        include: { sets: { where: { completed: true } } },
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
  const volumeStatuses = await getVolumeStatuses(userId, block.id, phase, block.customGuardrails);

  const recs: Recommendation[] = [];

  // --- Volume-based recommendations ---
  const belowFloor = volumeStatuses.filter((v) => v.status === 'below' && v.currentSets > 0);
  const aboveCeiling = volumeStatuses.filter((v) => v.status === 'above');

  if (belowFloor.length > 0) {
    const muscles = belowFloor.map((v) => formatMuscle(v.muscle)).join(', ');
    recs.push({
      id: 'volume-below-floor',
      category: 'volume',
      priority: 'high',
      title: 'Volume below target',
      detail: `${muscles}: below the minimum effective volume. Hit your set targets before changing anything else.`,
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
        ? `${muscles}: carrying more volume than you can recover from on a deficit. Settle toward maintenance volume.`
        : `${muscles}: above the maximum recoverable volume. Drop 1-2 sets or consider a deload.`,
    });
  }

  // --- Progression-based recommendations (phase-dependent) ---
  const regressing = progressions.filter((p) => p.status === 'regressing');
  const stalled = progressions.filter((p) => p.status === 'stalled');
  const progressing = progressions.filter((p) => p.status === 'progressing');

  if (phase === 'cut') {
    // Cut-specific logic
    if (regressing.length >= 3) {
      recs.push({
        id: 'cut-rapid-regression',
        category: 'phase',
        priority: 'high',
        title: 'Strength dropping across multiple exercises',
        detail: 'Multiple exercises regressing during your cut. The deficit may be too aggressive. Consider adding 100-200 calories per day.',
      });
    } else if (regressing.length > 0) {
      const names = regressing.map((p) => p.exerciseName).join(', ');
      recs.push({
        id: 'cut-some-regression',
        category: 'progression',
        priority: 'medium',
        title: 'Some strength loss during cut',
        detail: `${names}: regressing. Some loss is expected, but hold load and intensity to preserve muscle.`,
      });
    }

    if (stalled.length > 0 && regressing.length === 0) {
      recs.push({
        id: 'cut-maintaining',
        category: 'phase',
        priority: 'low',
        title: 'Preserving strength during cut',
        detail: 'Performance is holding steady. This is the goal during a cut. Keep it up.',
      });
    }
  } else {
    // Bulk / maintenance logic
    if (regressing.length >= 3) {
      recs.push({
        id: 'bulk-system-regression',
        category: 'deload',
        priority: 'high',
        title: 'Multiple exercises regressing',
        detail: 'Widespread performance decline. Recovery is likely the bottleneck. Consider a deload week.',
      });
    } else if (regressing.length > 0) {
      const names = regressing.map((p) => p.exerciseName).join(', ');
      recs.push({
        id: 'bulk-some-regression',
        category: 'deload',
        priority: 'high',
        title: 'Recovery may be an issue',
        detail: `${names}: performance declining. If sleep and food are dialed in, consider a deload.`,
      });
    }

    if (stalled.length > 0 && regressing.length === 0) {
      if (stalled.length >= 3) {
        recs.push({
          id: 'bulk-widespread-stall',
          category: 'deload',
          priority: 'high',
          title: 'Most exercises stalled',
          detail: 'Widespread stagnation. Try a 1-week deload first. If performance returns, it was fatigue. If not, look outside the gym.',
        });
      } else {
        const names = stalled.map((p) => p.exerciseName).join(', ');
        recs.push({
          id: 'bulk-stalled',
          category: 'progression',
          priority: 'medium',
          title: 'Exercises stalled',
          detail: `${names}: same performance for 3+ sessions. Consider adding a set or swapping to a variation.`,
        });
      }
    }

    if (progressing.length > 0 && regressing.length === 0 && stalled.length === 0) {
      recs.push({
        id: 'bulk-on-track',
        category: 'progression',
        priority: 'low',
        title: 'Everything is progressing',
        detail: 'All exercises are moving forward. Hold the current program.',
      });
    }
  }

  // Sort by priority
  const priorityOrder: Record<RecommendationPriority, number> = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recs.slice(0, 5);
}
