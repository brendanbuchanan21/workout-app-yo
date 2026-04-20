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
          entityLabel: name,
          severity: 'info',
          title: `${name}: minor regression`,
          summary: 'Performance dipped slightly, which can be normal during a cut.',
          bullets: [
            'Small rep or load dips are common under a deficit.',
            'Prioritize sleep, protein, and consistent training effort.',
            'Watch for whether this trend deepens over the next sessions.',
          ],
          qualifier,
        });
      } else if (phase === 'maintain' && p.magnitude === 'minor' && p.confidence === 'low') {
        insights.push({
          id: `progression-${p.exerciseName}-regressing`,
          kind: 'regressing',
          muscle: p.muscleGroup,
          entityLabel: name,
          severity: 'info',
          title: `${name}: slight dip`,
          summary: 'Performance is slightly down, but the signal is still noisy.',
          bullets: [
            'Low-confidence reads can come from sparse matched data.',
            'Keep effort and logging consistency high for cleaner reads.',
            'Re-check after a few more sessions before major changes.',
          ],
          qualifier,
        });
      } else if (phase === 'bulk' && p.magnitude === 'minor' && p.confidence === 'low') {
        insights.push({
          id: `progression-${p.exerciseName}-regressing`,
          kind: 'regressing',
          muscle: p.muscleGroup,
          entityLabel: name,
          severity: 'info',
          title: `${name}: slight dip`,
          summary: 'Performance has softened a bit, with low confidence in the trend.',
          bullets: [
            'Accumulated fatigue can blur short-term performance.',
            'Noisy logs or sparse matched sets reduce confidence.',
            'If this repeats, consider a variation or small volume tweak.',
          ],
          qualifier,
        });
      } else {
        insights.push({
          id: `progression-${p.exerciseName}-regressing`,
          kind: 'regressing',
          muscle: p.muscleGroup,
          entityLabel: name,
          severity: 'warning',
          title: `${name}: performance trending down`,
          summary: phase === 'cut'
            ? 'Performance has declined more than expected during this cut phase.'
            : 'Performance has declined over recent sessions.',
          bullets: phase === 'cut'
            ? [
              'Deficit aggressiveness may be limiting recovery.',
              'Volume may have dropped below a useful maintenance dose.',
              'Keep intensity high and verify recovery inputs.',
            ]
            : [
              'Accumulated fatigue may be masking output.',
              'Recovery quality outside the gym may be limiting adaptation.',
              'This variation may no longer be the best fit right now.',
            ],
          qualifier,
        });
      }
    } else if (p.status === 'stalled') {
      if (phase === 'cut') {
        insights.push({
          id: `progression-${p.exerciseName}-stalled`,
          kind: 'stalled',
          muscle: p.muscleGroup,
          entityLabel: name,
          severity: 'success',
          title: `Maintaining strength on ${name}`,
          summary: 'Performance is holding steady, which is a good cut-phase outcome.',
          bullets: [
            'Maintaining strength usually means muscle retention is on track.',
            'Keep load and effort consistent while calories stay lower.',
          ],
          qualifier,
        });
      } else if (p.confidence === 'low') {
        insights.push({
          id: `progression-${p.exerciseName}-stalled`,
          kind: 'stalled',
          muscle: p.muscleGroup,
          entityLabel: name,
          severity: 'info',
          title: `${name}: mostly flat`,
          summary: 'Recent performance is fairly steady, but the signal is limited.',
          bullets: [
            'There are not enough comparable sets for a strong read.',
            'Normal variation can look like a stall in short windows.',
            'Keep logging RIR and reps consistently to improve confidence.',
          ],
          qualifier,
        });
      } else {
        insights.push({
          id: `progression-${p.exerciseName}-stalled`,
          kind: 'stalled',
          muscle: p.muscleGroup,
          entityLabel: name,
          severity: 'warning',
          title: `${name} stalled`,
          summary: 'Performance has been mostly flat across recent sessions.',
          bullets: [
            'Stimulus may not be changing enough to drive progress.',
            'Fatigue may be hiding underlying adaptation.',
            'A variation swap or small dose change can help unstick it.',
          ],
          qualifier,
        });
      }
    } else if (p.status === 'progressing') {
      insights.push({
        id: `progression-${p.exerciseName}-progressing`,
        kind: 'progressing',
        muscle: p.muscleGroup,
        entityLabel: name,
        severity: 'success',
        title: `${name}: performance trending up`,
        summary: 'Recent sessions are moving in the right direction.',
        bullets: [
          p.detail,
          'Keep the current plan steady while this trend continues.',
        ],
        qualifier,
      });
    }
  }

  // Sort: warnings first, then info, then success
  const severityOrder: Record<InsightSeverity, number> = { warning: 0, info: 1, success: 2 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return insights;
}
