export const SPLIT_LABELS: Record<string, string> = {
  full_body: 'Full Body',
  upper_lower: 'Upper / Lower',
  push_pull_legs: 'Push / Pull / Legs',
  custom: 'Custom',
};

export const SPLIT_SUGGESTIONS: Record<number, string> = {
  3: 'full_body',
  4: 'upper_lower',
  5: 'push_pull_legs',
  6: 'push_pull_legs',
};

export const ALL_MUSCLE_GROUPS = [
  'chest', 'back', 'quads', 'hamstrings', 'side_delts', 'rear_delts',
  'biceps', 'triceps', 'calves', 'abs', 'glutes', 'traps',
];

export const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', quads: 'Quads', hamstrings: 'Hamstrings',
  side_delts: 'Side Delts', rear_delts: 'Rear Delts', biceps: 'Biceps',
  triceps: 'Triceps', calves: 'Calves', abs: 'Abs', glutes: 'Glutes', traps: 'Traps',
};

export const DEFAULT_VOLUME_GUARDRAILS: Record<string, { floor: number; ceiling: number }> = {
  chest: { floor: 6, ceiling: 22 },
  back: { floor: 6, ceiling: 22 },
  side_delts: { floor: 6, ceiling: 22 },
  quads: { floor: 4, ceiling: 18 },
  hamstrings: { floor: 4, ceiling: 16 },
  biceps: { floor: 4, ceiling: 20 },
  triceps: { floor: 4, ceiling: 18 },
  rear_delts: { floor: 4, ceiling: 18 },
  calves: { floor: 4, ceiling: 16 },
  abs: { floor: 0, ceiling: 16 },
  glutes: { floor: 0, ceiling: 16 },
  traps: { floor: 0, ceiling: 14 },
};

export const EQUIPMENT_ORDER = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'unknown'];

export const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
  unknown: 'Other',
};

export const VOLUME_DEFAULTS: Record<string, Record<string, number>> = {
  beginner: {
    chest: 8, back: 8, side_delts: 6, quads: 6,
    hamstrings: 4, biceps: 4, triceps: 4, rear_delts: 4, calves: 4, abs: 4,
  },
  intermediate: {
    chest: 10, back: 10, side_delts: 10, quads: 8,
    hamstrings: 6, biceps: 8, triceps: 6, rear_delts: 6, calves: 6, abs: 4,
  },
  advanced: {
    chest: 12, back: 12, side_delts: 12, quads: 10,
    hamstrings: 8, biceps: 10, triceps: 8, rear_delts: 8, calves: 8, abs: 6,
  },
};
