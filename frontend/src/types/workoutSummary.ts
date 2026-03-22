export interface PR {
  exerciseName: string;
  weightKg: number;
  reps: number;
  previousBestReps: number | null;
}

export interface ExerciseBest {
  exerciseName: string;
  weight: number;
  reps: number | null;
}

export interface SessionTonnage {
  date: string;
  tonnage: number;
}

export interface WorkoutSummary {
  totalSets: number;
  volumeByMuscle: Record<string, number>;
  tonnage: number;
  durationSeconds: number;
  completionRate: number;
  prs: PR[];
  perExerciseBest: ExerciseBest[];
  blockComparison: {
    sessionTonnages: SessionTonnage[];
    totalBlockSets: number;
    sessionsCompleted: number;
  };
}
