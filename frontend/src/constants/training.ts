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

export const DEFAULT_VOLUME_GUARDRAILS: Record<string, { mev: number; mrv: number }> = {
  chest: { mev: 6, mrv: 22 },
  back: { mev: 6, mrv: 22 },
  side_delts: { mev: 6, mrv: 22 },
  quads: { mev: 4, mrv: 18 },
  hamstrings: { mev: 4, mrv: 16 },
  biceps: { mev: 4, mrv: 20 },
  triceps: { mev: 4, mrv: 18 },
  rear_delts: { mev: 4, mrv: 18 },
  calves: { mev: 4, mrv: 16 },
  abs: { mev: 0, mrv: 16 },
  glutes: { mev: 0, mrv: 16 },
  traps: { mev: 0, mrv: 14 },
};

// Backward compat alias
export const VOLUME_GUARDRAILS = DEFAULT_VOLUME_GUARDRAILS;

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
