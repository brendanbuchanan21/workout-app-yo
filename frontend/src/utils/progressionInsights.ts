// Pure functions for deriving progression-based insights.
// Phase-dependent: the same status means different things during a bulk vs a cut.
// No React, no data fetching.

import { Insight, InsightSeverity } from './insights';

export interface ExerciseProgression {
  catalogId: string | null;
  exerciseName: string;
  muscleGroup: string;
  status: 'progressing' | 'stalled' | 'regressing';
  e1rmChangePercent: number;
  matchedEffortRepsDelta: number;
  sessionsAnalyzed: number;
  detail: string;
}

function formatName(name: string): string {
  return name.replace(/_/g, ' ');
}

/**
 * Derive insights from exercise progression data, framed by the current phase.
 *
 * During a bulk: stalled = warning, regressing = warning
 * During a cut: stalled = success (preserving), slow regression = info (expected)
 * During maintenance: behaves like a mild bulk
 */
export function deriveProgressionInsights(
  progressions: ExerciseProgression[],
  phaseIntent: string | null,
): Insight[] {
  const phase = phaseIntent || 'bulk';
  const insights: Insight[] = [];

  for (const p of progressions) {
    const name = formatName(p.exerciseName);

    if (p.status === 'regressing') {
      if (phase === 'cut' && p.e1rmChangePercent > -5) {
        // Slow regression during a cut is expected
        insights.push({
          id: `progression-${p.exerciseName}-regressing`,
          kind: 'regressing',
          muscle: p.muscleGroup,
          severity: 'info',
          title: `${name}: minor regression`,
          detail: `Small strength dip during a cut is expected. Hold load and intensity.`,
        });
      } else {
        insights.push({
          id: `progression-${p.exerciseName}-regressing`,
          kind: 'regressing',
          muscle: p.muscleGroup,
          severity: 'warning',
          title: `${name} is regressing`,
          detail: phase === 'cut'
            ? `Rapid strength loss. Consider slowing the deficit or checking recovery.`
            : `Recovery may be the bottleneck. Consider a deload.`,
        });
      }
    } else if (p.status === 'stalled') {
      if (phase === 'cut') {
        insights.push({
          id: `progression-${p.exerciseName}-stalled`,
          kind: 'stalled',
          muscle: p.muscleGroup,
          severity: 'success',
          title: `Maintaining strength on ${name}`,
          detail: `Holding performance during a cut is the goal. Keep it up.`,
        });
      } else {
        insights.push({
          id: `progression-${p.exerciseName}-stalled`,
          kind: 'stalled',
          muscle: p.muscleGroup,
          severity: 'warning',
          title: `${name} stalled`,
          detail: `Same performance for 3+ sessions. Consider adding a set or swapping variation.`,
        });
      }
    } else if (p.status === 'progressing') {
      insights.push({
        id: `progression-${p.exerciseName}-progressing`,
        kind: 'progressing',
        muscle: p.muscleGroup,
        severity: 'success',
        title: `${name} is progressing`,
        detail: p.detail,
      });
    }
  }

  // Sort: warnings first, then info, then success
  const severityOrder: Record<InsightSeverity, number> = { warning: 0, info: 1, success: 2 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return insights;
}
