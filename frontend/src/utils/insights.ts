// Pure detector functions for volume-based insights.
// No React, no data fetching. Trivially unit-testable.

export interface VolumeWeek {
  weekStart: string;
  muscles: Record<string, number>;
}

export interface Guardrail {
  floor: number;
  ceiling: number;
}

export type InsightSeverity = 'info' | 'warning' | 'success';
export type InsightKind = 'above-ceiling' | 'below-floor' | 'declining' | 'progressing' | 'stalled' | 'regressing';
type VolumeInsightKind = 'above-ceiling' | 'below-floor' | 'declining';

export interface Insight {
  id: string;
  kind: InsightKind;
  muscle: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
}

// Analysis window: last ~12 weeks regardless of the Volume tab's range selector.
const WINDOW_WEEKS = 12;
// A muscle must have a non-zero value in at least this fraction of the window,
// otherwise we skip it (avoid flagging muscles the user doesn't train at all).
const MIN_ACTIVE_FRACTION = 0.5;
// Streak threshold for above/below guardrail insights.
const STREAK_THRESHOLD = 3;
// Minimum window for a declining-trend insight.
const DECLINE_MIN_WEEKS = 6;
// Decline trigger: second half average ≥ this fraction lower than first half.
const DECLINE_PCT = 0.2;

function formatMuscle(muscle: string): string {
  return muscle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function takeWindow(weeks: VolumeWeek[]): VolumeWeek[] {
  // weeks are expected chronologically ascending (oldest -> newest).
  // Take the last WINDOW_WEEKS entries.
  if (weeks.length <= WINDOW_WEEKS) return weeks;
  return weeks.slice(weeks.length - WINDOW_WEEKS);
}

function collectMuscles(weeks: VolumeWeek[]): string[] {
  const set = new Set<string>();
  for (const w of weeks) {
    for (const m of Object.keys(w.muscles)) set.add(m);
  }
  return Array.from(set);
}

function seriesFor(weeks: VolumeWeek[], muscle: string): number[] {
  return weeks.map((w) => w.muscles[muscle] || 0);
}

function isActiveEnough(series: number[]): boolean {
  if (series.length === 0) return false;
  const nonZero = series.filter((v) => v > 0).length;
  return nonZero / series.length >= MIN_ACTIVE_FRACTION;
}

// Count consecutive most-recent weeks that satisfy predicate.
function trailingStreak(series: number[], pred: (v: number) => boolean): number {
  let n = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (pred(series[i])) n++;
    else break;
  }
  return n;
}

function detectAboveCeiling(
  muscle: string,
  series: number[],
  guard: Guardrail,
): Insight | null {
  const streak = trailingStreak(series, (v) => v > guard.ceiling);
  if (streak < STREAK_THRESHOLD) return null;
  return {
    id: `above-ceiling:${muscle}`,
    kind: 'above-ceiling',
    muscle,
    severity: 'warning',
    title: `${formatMuscle(muscle)} above ceiling`,
    detail: `${formatMuscle(muscle)} has been above the ceiling for ${streak} weeks. Watch for fatigue or overreach.`,
  };
}

function detectBelowFloor(
  muscle: string,
  series: number[],
  guard: Guardrail,
): Insight | null {
  // If floor is 0, "below floor" is meaningless for this muscle.
  if (guard.floor <= 0) return null;
  const streak = trailingStreak(series, (v) => v < guard.floor);
  if (streak < STREAK_THRESHOLD) return null;
  return {
    id: `below-floor:${muscle}`,
    kind: 'below-floor',
    muscle,
    severity: 'info',
    title: `${formatMuscle(muscle)} below productive range`,
    detail: `${formatMuscle(muscle)} has been below the productive range for ${streak} weeks. Consider adding sets.`,
  };
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  let s = 0;
  for (const n of nums) s += n;
  return s / nums.length;
}

function detectDeclining(muscle: string, series: number[]): Insight | null {
  if (series.length < DECLINE_MIN_WEEKS) return null;
  const mid = Math.floor(series.length / 2);
  const firstHalf = series.slice(0, mid);
  const secondHalf = series.slice(mid);
  const a = average(firstHalf);
  const b = average(secondHalf);
  if (a <= 0) return null;
  const drop = (a - b) / a;
  if (drop < DECLINE_PCT) return null;
  const pct = Math.round(drop * 100);
  return {
    id: `declining:${muscle}`,
    kind: 'declining',
    muscle,
    severity: 'info',
    title: `${formatMuscle(muscle)} trending down`,
    detail: `${formatMuscle(muscle)} volume is down ${pct}% over the last ${series.length} weeks.`,
  };
}

// Priority when multiple insights fire for the same muscle.
// Higher number wins.
const KIND_PRIORITY: Record<VolumeInsightKind, number> = {
  'above-ceiling': 3,
  'below-floor': 2,
  'declining': 1,
};

function getKindPriority(kind: InsightKind): number {
  return KIND_PRIORITY[kind as VolumeInsightKind] ?? 0;
}

export function detectVolumeInsights(
  weeks: VolumeWeek[],
  guardrails: Record<string, Guardrail>,
): Insight[] {
  const windowWeeks = takeWindow(weeks);
  if (windowWeeks.length === 0) return [];

  const muscles = collectMuscles(windowWeeks);
  const picked: Insight[] = [];

  for (const muscle of muscles) {
    const series = seriesFor(windowWeeks, muscle);
    if (!isActiveEnough(series)) continue;

    const guard = guardrails[muscle];
    const candidates: Insight[] = [];
    if (guard) {
      const above = detectAboveCeiling(muscle, series, guard);
      if (above) candidates.push(above);
      const below = detectBelowFloor(muscle, series, guard);
      if (below) candidates.push(below);
    }
    const declining = detectDeclining(muscle, series);
    if (declining) candidates.push(declining);

    if (candidates.length === 0) continue;
    candidates.sort((a, b) => getKindPriority(b.kind) - getKindPriority(a.kind));
    picked.push(candidates[0]);
  }

  // Sort final list by severity (warnings first), then by kind priority.
  picked.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'warning' ? -1 : 1;
    return getKindPriority(b.kind) - getKindPriority(a.kind);
  });

  return picked;
}
