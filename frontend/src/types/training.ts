export interface DayOption {
  dayLabel: string;
  muscleGroups: string[];
  completed?: boolean;
  exercises?: string[];
}

export interface TodayContext {
  trainingBlockId: string;
  weekNumber: number;
  dayIndex: number;
  dayLabel: string;
  dayOptions?: DayOption[];
  suggestedMuscleGroups: string[];
  targetRir: number;
  splitType: string;
  setupMethod: string | null;
  volumeTargets: Record<string, number>;
}

export interface CatalogExercise {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
  movementType: string;
  repRangeLow: number;
  repRangeHigh: number;
}

export interface SetPrescription {
  setNumber: number;
  targetWeightKg: number | null;
  targetReps: number | null;
  targetRir: number;
}

export interface PendingExercise {
  catalogId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: number;
  repRangeLow: number;
  repRangeHigh: number;
  prescription?: SetPrescription[];
  adjustmentNote?: string | null;
}
