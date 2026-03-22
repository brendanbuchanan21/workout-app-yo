// Volume guardrails per muscle group: MEV (minimum effective) and MRV (maximum recoverable)
export const VOLUME_GUARDRAILS: Record<string, { mev: number; mrv: number }> = {
  chest:      { mev: 6, mrv: 22 },
  back:       { mev: 6, mrv: 22 },
  side_delts: { mev: 6, mrv: 22 },
  quads:      { mev: 4, mrv: 18 },
  hamstrings: { mev: 4, mrv: 16 },
  biceps:     { mev: 4, mrv: 20 },
  triceps:    { mev: 4, mrv: 18 },
  rear_delts: { mev: 4, mrv: 18 },
  calves:     { mev: 4, mrv: 16 },
  abs:        { mev: 0, mrv: 16 },
  glutes:     { mev: 0, mrv: 16 },
  traps:      { mev: 0, mrv: 14 },
};

/**
 * Merge custom guardrails overrides with defaults.
 * customGuardrails is a sparse map like { "chest": { "mev": 8 } }.
 */
export function getEffectiveGuardrails(
  customGuardrails?: Record<string, { mev?: number; mrv?: number }> | null
): Record<string, { mev: number; mrv: number }> {
  if (!customGuardrails) return { ...VOLUME_GUARDRAILS };

  const result: Record<string, { mev: number; mrv: number }> = {};
  for (const [muscle, defaults] of Object.entries(VOLUME_GUARDRAILS)) {
    const overrides = customGuardrails[muscle];
    result[muscle] = {
      mev: overrides?.mev ?? defaults.mev,
      mrv: overrides?.mrv ?? defaults.mrv,
    };
  }
  return result;
}

// Split day definitions: which muscle groups go on which day
export const SPLIT_DEFINITIONS: Record<string, string[][]> = {
  push_pull_legs: [
    ['chest', 'side_delts', 'triceps'],       // Push A
    ['back', 'rear_delts', 'biceps'],          // Pull A
    ['quads', 'hamstrings', 'calves', 'abs'],  // Legs A
    ['chest', 'side_delts', 'triceps'],        // Push B
    ['back', 'rear_delts', 'biceps'],          // Pull B
    ['quads', 'hamstrings', 'glutes', 'calves', 'abs'], // Legs B
  ],
  upper_lower: [
    ['chest', 'back', 'side_delts', 'biceps', 'triceps'],                     // Upper A
    ['quads', 'hamstrings', 'calves', 'abs'],                                  // Lower A
    ['chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps'],       // Upper B
    ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],                        // Lower B
  ],
  full_body: [
    ['chest', 'back', 'quads', 'hamstrings', 'side_delts', 'biceps', 'triceps'],
    ['chest', 'back', 'quads', 'hamstrings', 'side_delts', 'rear_delts', 'abs'],
    ['chest', 'back', 'quads', 'hamstrings', 'biceps', 'triceps', 'calves'],
  ],
};

export const SPLIT_DAY_LABELS: Record<string, string[]> = {
  push_pull_legs: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'],
  upper_lower: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
  full_body: ['Full Body A', 'Full Body B', 'Full Body C'],
};

/**
 * Calculate volume (sets) for a given week within a training block.
 * Week 1 = base volume, increases ~1-2 sets per week, deload = 50%.
 */
export function getSetsForWeek(
  baseVolume: number,
  weekNumber: number,
  lengthWeeks: number
): number {
  const deloadWeek = lengthWeeks;

  if (weekNumber === deloadWeek) {
    return Math.round(baseVolume * 0.5);
  }

  // Progressive overload: +1 set every 2 working weeks
  const additionalSets = Math.floor((weekNumber - 1) / 2);
  return baseVolume + additionalSets;
}

/**
 * Get target RIR for a given week.
 * Uses training block config for starting RIR, floor, decrement, and deload RIR.
 * See resources/rir-progression-model.md for research basis.
 */
export interface RirConfig {
  startingRir: number;
  rirFloor: number;
  rirDecrementPerWeek: number;
  deloadRir: number;
}

const DEFAULT_RIR_CONFIG: RirConfig = {
  startingRir: 3,
  rirFloor: 1,
  rirDecrementPerWeek: 1,
  deloadRir: 6,
};

export function getRirForWeek(
  weekNumber: number,
  lengthWeeks: number,
  config?: Partial<RirConfig>,
): number {
  const { startingRir, rirFloor, rirDecrementPerWeek, deloadRir } = {
    ...DEFAULT_RIR_CONFIG,
    ...config,
  };

  if (weekNumber === lengthWeeks) return deloadRir;

  const rawRir = startingRir - (weekNumber - 1) * rirDecrementPerWeek;
  return Math.max(rirFloor, Math.round(rawRir));
}

/**
 * Get day labels for a split type trimmed to the number of training days.
 * For custom splits, pass customDays from the training block.
 */
export function getDayLabels(
  splitType: string,
  daysPerWeek: number,
  customDays?: { dayLabel: string; muscleGroups: string[] }[]
): string[] {
  if (splitType === 'custom' && customDays) {
    return customDays.map((d) => d.dayLabel);
  }
  const labels = SPLIT_DAY_LABELS[splitType] || SPLIT_DAY_LABELS.push_pull_legs;
  return labels.slice(0, daysPerWeek);
}

/**
 * Get muscle groups for a specific day index within a split.
 * For custom splits, pass customDays from the training block.
 */
export function getMuscleGroupsForDay(
  splitType: string,
  dayIndex: number,
  customDays?: { dayLabel: string; muscleGroups: string[] }[]
): string[] {
  if (splitType === 'custom' && customDays) {
    return customDays[dayIndex % customDays.length]?.muscleGroups || [];
  }
  const days = SPLIT_DEFINITIONS[splitType] || SPLIT_DEFINITIONS.push_pull_legs;
  return days[dayIndex % days.length];
}
