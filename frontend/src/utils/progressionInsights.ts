// Pure functions for deriving progression-based insights.
// Phase-dependent: the same status means different things during a bulk vs a cut.
// No React, no data fetching.

import { Insight, InsightSeverity } from './insights';

export interface ExerciseProgression {
  catalogId: string | null;
  exerciseName: string;
  muscleGroup: string;
  status: 'progressing' | 'stalled' | 'regressing';
  magnitude: 'minor' | 'moderate' | 'strong';
  confidence: 'low' | 'medium' | 'high';
  signalBasis: 'matched_effort' | 'e1rm_fallback' | 'mixed' | 'limited_data';
  e1rmChangePercent: number;
  matchedEffortRepsDelta: number;
  matchedEffortPairs: number;
  sessionsAnalyzed: number;
  detail: string;
}

function formatName(name: string): string {
  return name.replace(/_/g, ' ');
}

function getSignalQualifier(p: ExerciseProgression): string {
  if (p.signalBasis === 'limited_data') return 'This read is based on limited comparable data.';
  if (p.signalBasis === 'e1rm_fallback') return 'This read leans more on filtered strength trend than matched-effort comparisons.';
  if (p.signalBasis === 'mixed') return 'Matched-effort performance and filtered strength trend point in the same direction.';
  return 'This read is primarily based on matched-effort performance.';
}

/**
 * Derive insights from exercise progression data, framed by the current phase.
 *
 * The backend owns the progression interpretation. The frontend's job is to
 * frame that interpretation for the current phase without pretending it is a diagnosis.
 */
export function deriveProgressionInsights(
  progressions: ExerciseProgression[],
  phaseIntent: string | null,
): Insight[] {
  const phase = phaseIntent || 'bulk';
  const insights: Insight[] = [];

  for (const p of progressions) {
    const name = formatName(p.exerciseName);
    const qualifier = getSignalQualifier(p);

    if (p.status === 'regressing') {
      if (phase === 'cut' && p.magnitude === 'minor') {
        insights.push({
          id: `progression-${p.exerciseName}-regressing`,
          kind: 'regressing',
          muscle: p.muscleGroup,
          severity: 'info',
          title: `${name}: minor regression`,
          detail: `Performance has dipped slightly. During a cut, that can happen. Common reasons include normal fatigue, the deficit catching up, or day-to-day variation. ${qualifier}`,
        });
      } else if (phase === 'maintain' && p.magnitude === 'minor' && p.confidence === 'low') {
        insights.push({
          id: `progression-${p.exerciseName}-regressing`,
          kind: 'regressing',
          muscle: p.muscleGroup,
          severity: 'info',
          title: `${name}: slight dip`,
          detail: `Performance is trending down slightly. Common reasons include fatigue, inconsistent effort, or a noisy comparison window. ${qualifier}`,
        });
      } else if (phase === 'bulk' && p.magnitude === 'minor' && p.confidence === 'low') {
        insights.push({
          id: `progression-${p.exerciseName}-regressing`,
          kind: 'regressing',
          muscle: p.muscleGroup,
          severity: 'info',
          title: `${name}: slight dip`,
          detail: `Performance has softened a bit. Common reasons include accumulated fatigue, noisy logging, or an exercise that isn't fitting as well right now. ${qualifier}`,
        });
      } else {
        insights.push({
          id: `progression-${p.exerciseName}-regressing`,
          kind: 'regressing',
          muscle: p.muscleGroup,
          severity: 'warning',
          title: `${name}: performance trending down`,
          detail: phase === 'cut'
            ? `Performance has declined more clearly than expected for a cut. The most common reasons are a deficit that is too aggressive, recovery strain, or volume that has fallen too low. ${qualifier}`
            : phase === 'maintain'
              ? `Performance has declined over recent sessions. The most common reasons are accumulated fatigue, weaker recovery outside the gym, or an exercise that is no longer fitting well. ${qualifier}`
              : `Performance has declined over recent sessions. The most common reasons are accumulated fatigue, weaker recovery, not enough useful stimulus, or an exercise that is no longer fitting well. ${qualifier}`,
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
          detail: `Performance is holding steady, which is usually a good outcome during a cut. ${qualifier}`,
        });
      } else if (p.confidence === 'low') {
        insights.push({
          id: `progression-${p.exerciseName}-stalled`,
          kind: 'stalled',
          muscle: p.muscleGroup,
          severity: 'info',
          title: `${name}: mostly flat`,
          detail: `Recent performance looks fairly steady, but the comparison set is limited. Common reasons include normal variation or not enough matched data yet. ${qualifier}`,
        });
      } else {
        insights.push({
          id: `progression-${p.exerciseName}-stalled`,
          kind: 'stalled',
          muscle: p.muscleGroup,
          severity: 'warning',
          title: `${name} stalled`,
          detail: `Performance has been mostly flat across recent sessions. The most common reasons are that stimulus is no longer changing enough, fatigue is masking progress, or the exercise has gone stale. ${qualifier}`,
        });
      }
    } else if (p.status === 'progressing') {
      insights.push({
        id: `progression-${p.exerciseName}-progressing`,
        kind: 'progressing',
        muscle: p.muscleGroup,
        severity: 'success',
        title: `${name}: performance trending up`,
        detail: `Recent sessions are moving in the right direction. ${p.detail}. ${qualifier}`,
      });
    }
  }

  // Sort: warnings first, then info, then success
  const severityOrder: Record<InsightSeverity, number> = { warning: 0, info: 1, success: 2 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return insights;
}
