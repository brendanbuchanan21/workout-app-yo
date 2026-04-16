// Volume guardrails per muscle group: floor (minimum productive) and ceiling (maximum recoverable)
export const VOLUME_GUARDRAILS: Record<string, { floor: number; ceiling: number }> = {
  chest:      { floor: 6, ceiling: 22 },
  back:       { floor: 6, ceiling: 22 },
  side_delts: { floor: 6, ceiling: 22 },
  quads:      { floor: 4, ceiling: 18 },
  hamstrings: { floor: 4, ceiling: 16 },
  biceps:     { floor: 4, ceiling: 20 },
  triceps:    { floor: 4, ceiling: 18 },
  rear_delts: { floor: 4, ceiling: 18 },
  calves:     { floor: 4, ceiling: 16 },
  abs:        { floor: 0, ceiling: 16 },
  glutes:     { floor: 0, ceiling: 16 },
  traps:      { floor: 0, ceiling: 14 },
};

/**
 * Merge custom guardrails overrides with defaults.
 * customGuardrails is a sparse map like { "chest": { "floor": 8 } }.
 */
export function getEffectiveGuardrails(
  customGuardrails?: Record<string, { floor?: number; ceiling?: number }> | null
): Record<string, { floor: number; ceiling: number }> {
  if (!customGuardrails) return { ...VOLUME_GUARDRAILS };

  const result: Record<string, { floor: number; ceiling: number }> = {};
  for (const [muscle, defaults] of Object.entries(VOLUME_GUARDRAILS)) {
    const overrides = customGuardrails[muscle];
    result[muscle] = {
      floor: overrides?.floor ?? defaults.floor,
      ceiling: overrides?.ceiling ?? defaults.ceiling,
    };
  }
  return result;
}

/**
 * Adjust guardrail ceilings based on nutrition phase intent.
 * Bulk/null: full growth ceilings. Maintain: ~67%. Cut: ~50% (maintenance volume).
 * Floors stay the same in all phases to protect against muscle loss.
 */
export function getPhaseAdjustedGuardrails(
  baseGuardrails: Record<string, { floor: number; ceiling: number }>,
  phaseIntent: string | null,
): Record<string, { floor: number; ceiling: number }> {
  if (!phaseIntent || phaseIntent === 'bulk') return baseGuardrails;

  const multiplier = phaseIntent === 'cut' ? 0.5 : 0.67;
  const result: Record<string, { floor: number; ceiling: number }> = {};
  for (const [muscle, g] of Object.entries(baseGuardrails)) {
    const adjustedCeiling = Math.max(g.floor, Math.round(g.ceiling * multiplier));
    result[muscle] = { floor: g.floor, ceiling: adjustedCeiling };
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
 * Week 1 = base volume, then increases ~1 set every 2 weeks.
 */
export function getSetsForWeek(
  baseVolume: number,
  weekNumber: number,
  lengthWeeks: number
): number {
  // Progressive overload: +1 set every 2 working weeks
  const additionalSets = Math.floor((weekNumber - 1) / 2);
  return baseVolume + additionalSets;
}

/**
 * Get target RIR for a given week.
 * Uses training block config for starting RIR, floor, and decrement.
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
  const { startingRir, rirFloor, rirDecrementPerWeek } = {
    ...DEFAULT_RIR_CONFIG,
    ...config,
  };

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
  if (customDays && customDays.length > 0) {
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
  if (customDays && customDays.length > 0) {
    return customDays[dayIndex % customDays.length]?.muscleGroups || [];
  }
  const days = SPLIT_DEFINITIONS[splitType] || SPLIT_DEFINITIONS.push_pull_legs;
  return days[dayIndex % days.length];
}
