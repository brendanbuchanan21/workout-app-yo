/**
 * Session Autoregulation Service
 *
 * Evaluates completed sessions and generates prescriptions for the next
 * session of the same workout day (e.g., "Push A" → next "Push A").
 *
 * Uses Dynamic Double Progression with rep trend monitoring, intra-session
 * fatigue analysis, performance scoring, and volume adjustment.
 * See resources/session-autoregulation-model.md for research basis.
 */

// Weight increments for double progression (in kg)
const UPPER_BODY_INCREMENT_KG = 2.27; // ~5 lbs
const LOWER_BODY_INCREMENT_KG = 4.54; // ~10 lbs

const UPPER_BODY_MUSCLES = ['chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'traps'];
const LOWER_BODY_MUSCLES = ['quads', 'hamstrings', 'calves', 'glutes', 'abs'];

export interface PreviousSetData {
  setNumber: number;
  actualWeightKg: number | null;
  actualReps: number | null;
  actualRir: number | null;
  completed: boolean;
}

export interface PreviousExerciseData {
  catalogId: string | null;
  exerciseName: string;
  muscleGroup: string;
  sets: PreviousSetData[];
}

export interface SetPrescription {
  setNumber: number;
  targetWeightKg: number | null;
  targetReps: number | null;
  targetRir: number;
}

export interface ExercisePrescription {
  catalogId: string | null;
  exerciseName: string;
  muscleGroup: string;
  sets: SetPrescription[];
  adjustmentNote: string | null;
}

export interface SessionPrescription {
  exercises: ExercisePrescription[];
  sessionNote: string | null;
}

/**
 * Get the weight increment based on the muscle group.
 */
function getIncrement(muscleGroup: string): number {
  return LOWER_BODY_MUSCLES.includes(muscleGroup)
    ? LOWER_BODY_INCREMENT_KG
    : UPPER_BODY_INCREMENT_KG;
}

/**
 * Compare reps at matching weights between two sessions.
 * Returns the fraction of matched sets that declined (0 to 1), or null if no sets matched.
 */
function computeDeclineRatio(
  recentSets: PreviousSetData[],
  olderSets: PreviousSetData[],
): number | null {
  const recentCompleted = recentSets.filter((s) => s.completed && s.actualWeightKg != null && s.actualReps != null);
  const olderCompleted = olderSets.filter((s) => s.completed && s.actualWeightKg != null && s.actualReps != null);

  if (recentCompleted.length === 0 || olderCompleted.length === 0) return null;

  let matchedDeclines = 0;
  let matchedSets = 0;

  for (const recentSet of recentCompleted) {
    const olderMatch = olderCompleted.find((o) => o.actualWeightKg === recentSet.actualWeightKg);
    if (olderMatch && olderMatch.actualReps != null && recentSet.actualReps != null) {
      matchedSets++;
      if (recentSet.actualReps < olderMatch.actualReps) matchedDeclines++;
    }
  }

  if (matchedSets === 0) return null;
  return matchedDeclines / matchedSets;
}

/**
 * Compute intra-session fatigue: rep drop-off from set 1 to the final set.
 * Returns drop-off as a fraction (0 to 1), or null if not enough data.
 *
 * Interpretation:
 *   0-15%  → low fatigue, productive
 *   15-30% → moderate fatigue, normal for 3-4 sets
 *   30-40% → high fatigue, approaching practical limits
 *   40%+   → excessive fatigue, junk volume territory
 */
function computeFatigueDropOff(sets: PreviousSetData[]): number | null {
  const completed = sets.filter((s) => s.completed && s.actualReps != null && s.actualWeightKg != null);
  if (completed.length < 2) return null;

  // Only compare sets at the same weight for meaningful drop-off
  const firstSet = completed[0];
  const sameWeightSets = completed.filter((s) => s.actualWeightKg === firstSet.actualWeightKg);
  if (sameWeightSets.length < 2) return null;

  const firstReps = sameWeightSets[0].actualReps!;
  const lastReps = sameWeightSets[sameWeightSets.length - 1].actualReps!;

  if (firstReps === 0) return null;
  return Math.max(0, (firstReps - lastReps) / firstReps);
}

/**
 * Compute a performance score for an exercise (0 to 1).
 *
 * Components:
 *   Rep trend (50%):     +1 improving, 0 maintaining, -1 declining → normalized to 0-1
 *   Completion rate (25%): completed sets / total sets
 *   RIR accuracy (25%):   1 - normalized deviation from target RIR
 */
function computePerformanceScore(
  exercise: PreviousExerciseData,
  olderExercise: PreviousExerciseData | null,
  targetRir: number,
): number {
  const completedSets = exercise.sets.filter((s) => s.completed);
  const totalSets = exercise.sets.length;

  // Completion rate (25%)
  const completionRate = totalSets > 0 ? completedSets.length / totalSets : 1;

  // Rep trend (50%): compare to older session
  let repTrendScore = 0.5; // neutral if no older data
  if (olderExercise) {
    const declineRatio = computeDeclineRatio(exercise.sets, olderExercise.sets);
    if (declineRatio !== null) {
      // declineRatio 0 = all improving/holding, 1 = all declining
      // Convert: 0 decline → 1.0 score, 0.5 decline → 0.5 score, 1.0 decline → 0.0 score
      repTrendScore = 1 - declineRatio;
    }
  }

  // RIR accuracy (25%): how close actual RIR was to target
  const rirValues = completedSets
    .filter((s) => s.actualRir != null)
    .map((s) => s.actualRir!);
  let rirScore = 0.75; // default if no RIR data
  if (rirValues.length > 0) {
    const avgDeviation = rirValues.reduce((sum, rir) => sum + Math.abs(rir - targetRir), 0) / rirValues.length;
    // Deviation of 0 → score 1.0, deviation of 4+ → score 0.0
    rirScore = Math.max(0, 1 - avgDeviation / 4);
  }

  return repTrendScore * 0.5 + completionRate * 0.25 + rirScore * 0.25;
}

/**
 * Evaluate a single exercise and generate set prescriptions for the next session.
 *
 * Logic: Dynamic Double Progression with volume adjustment
 * - For each set, if the previous set hit the top of the rep range at target RIR,
 *   increase weight by the increment and target the bottom of the range
 * - Otherwise, keep the same weight and target the same or slightly higher reps
 * - Remove the last set if fatigue drop-off is excessive (40%+) or reps declined
 *   for 2+ consecutive sessions
 * - Add a set if all sets hit top of range at target RIR and fatigue is low
 */
export function prescribeExercise(
  prevExercise: PreviousExerciseData,
  targetRir: number,
  repRangeLow: number,
  repRangeHigh: number,
  olderSessions: PreviousExerciseData[],
): ExercisePrescription {
  const increment = getIncrement(prevExercise.muscleGroup);
  const completedSets = prevExercise.sets.filter((s) => s.completed && s.actualWeightKg != null && s.actualReps != null);

  // --- Decline detection: require 2+ consecutive sessions of decline ---
  let consecutiveDeclines = 0;
  if (olderSessions.length >= 1) {
    // Check session N vs N-1 (most recent vs one before)
    const ratio1 = computeDeclineRatio(prevExercise.sets, olderSessions[0].sets);
    if (ratio1 !== null && ratio1 > 0.5) {
      consecutiveDeclines = 1;
      // Check session N-1 vs N-2
      if (olderSessions.length >= 2) {
        const ratio2 = computeDeclineRatio(olderSessions[0].sets, olderSessions[1].sets);
        if (ratio2 !== null && ratio2 > 0.5) {
          consecutiveDeclines = 2;
        }
      }
    }
  }

  // --- Intra-session fatigue ---
  const fatigueDropOff = computeFatigueDropOff(prevExercise.sets);

  // --- Sandbagging detection ---
  const rirValues = completedSets
    .filter((s) => s.actualRir != null)
    .map((s) => s.actualRir!);
  let sandbagging = false;
  if (rirValues.length > 0) {
    const avgRir = rirValues.reduce((a, b) => a + b, 0) / rirValues.length;
    if (avgRir >= targetRir + 3) sandbagging = true;
  }

  // --- Check if all sets hit top of range at target RIR ---
  const allSetsTopOfRange = completedSets.length > 0 && completedSets.every((s) => {
    const reps = s.actualReps!;
    const rir = s.actualRir ?? targetRir;
    return reps >= repRangeHigh && rir >= targetRir;
  });

  // --- Completion rate ---
  const completionRate = prevExercise.sets.length > 0
    ? completedSets.length / prevExercise.sets.length
    : 1;

  // --- Build adjustment note ---
  let adjustmentNote: string | null = null;

  if (consecutiveDeclines >= 2) {
    adjustmentNote = 'Reps declined for 2+ sessions. Reducing volume by 1 set, consider lowering weight.';
  } else if (consecutiveDeclines === 1) {
    adjustmentNote = 'Reps declined vs. previous session. Holding volume, monitoring next session.';
  }

  if (completionRate < 0.7 && !adjustmentNote) {
    adjustmentNote = 'Completion rate below 70%. Consider reducing volume or weight.';
  }

  if (fatigueDropOff !== null && fatigueDropOff >= 0.4 && !adjustmentNote) {
    adjustmentNote = 'Excessive rep drop-off last session (40%+). Removing last set to avoid junk volume.';
  }

  if (sandbagging && !adjustmentNote) {
    adjustmentNote = 'RIR was well above target. Consider pushing harder or increasing weight.';
  }

  if (allSetsTopOfRange && fatigueDropOff !== null && fatigueDropOff < 0.15 && !adjustmentNote) {
    adjustmentNote = 'All sets hit top of range with low fatigue. Adding 1 set.';
  }

  // --- Determine set count (volume adjustment) ---
  let numSets = Math.max(completedSets.length, prevExercise.sets.length);

  if (consecutiveDeclines >= 2) {
    // Remove 1 set (minimum 1)
    numSets = Math.max(1, numSets - 1);
  } else if (fatigueDropOff !== null && fatigueDropOff >= 0.4) {
    // Remove last set (junk volume)
    numSets = Math.max(1, numSets - 1);
  } else if (allSetsTopOfRange && fatigueDropOff !== null && fatigueDropOff < 0.15) {
    // Add 1 set (capped at 6)
    numSets = Math.min(6, numSets + 1);
  }

  // --- Generate per-set prescriptions ---
  const sets: SetPrescription[] = [];

  for (let i = 0; i < numSets; i++) {
    const prevSet = completedSets[i];

    if (!prevSet || prevSet.actualWeightKg == null || prevSet.actualReps == null) {
      // No data for this set (new set or incomplete), carry forward from last known
      const lastKnown = completedSets[completedSets.length - 1];
      sets.push({
        setNumber: i + 1,
        targetWeightKg: lastKnown?.actualWeightKg ?? null,
        targetReps: lastKnown?.actualReps ?? repRangeHigh,
        targetRir: targetRir,
      });
      continue;
    }

    const prevWeight = prevSet.actualWeightKg;
    const prevReps = prevSet.actualReps;
    const prevRir = prevSet.actualRir ?? targetRir;

    // Dynamic Double Progression: does this set qualify for a weight increase?
    const hitTopOfRange = prevReps >= repRangeHigh;
    const rirOnTarget = prevRir >= targetRir;

    if (hitTopOfRange && rirOnTarget && consecutiveDeclines === 0) {
      // Increase weight, drop to bottom of rep range
      sets.push({
        setNumber: i + 1,
        targetWeightKg: Math.round((prevWeight + increment) * 100) / 100,
        targetReps: repRangeLow,
        targetRir: targetRir,
      });
    } else {
      // Hold weight, aim for same or +1 rep
      sets.push({
        setNumber: i + 1,
        targetWeightKg: prevWeight,
        targetReps: Math.min(prevReps + 1, repRangeHigh),
        targetRir: targetRir,
      });
    }
  }

  return {
    catalogId: prevExercise.catalogId,
    exerciseName: prevExercise.exerciseName,
    muscleGroup: prevExercise.muscleGroup,
    sets,
    adjustmentNote,
  };
}

/**
 * Generate a full session prescription based on completed sessions
 * for the same day label. Requires up to 3 most recent sessions:
 * the last session for load prescription, and 2 older sessions
 * for consecutive decline detection.
 */
export function prescribeSession(
  prevExercises: PreviousExerciseData[],
  targetRir: number,
  repRanges: Record<string, { low: number; high: number }>,
  olderSessionsList: PreviousExerciseData[][] | null,
): SessionPrescription {
  const exercises: ExercisePrescription[] = [];
  let sessionNote: string | null = null;

  for (const prevEx of prevExercises) {
    const range = repRanges[prevEx.catalogId || prevEx.exerciseName] || { low: 6, high: 12 };

    // Build the array of older matching exercises (up to 2)
    const olderExercises: PreviousExerciseData[] = [];
    if (olderSessionsList) {
      for (const olderSession of olderSessionsList) {
        const match = olderSession.find(
          (o) => (o.catalogId && o.catalogId === prevEx.catalogId) || o.exerciseName === prevEx.exerciseName
        );
        if (match) olderExercises.push(match);
      }
    }

    const prescription = prescribeExercise(prevEx, targetRir, range.low, range.high, olderExercises);
    exercises.push(prescription);
  }

  // Session-level notes
  const decliningCount = exercises.filter((e) => e.adjustmentNote?.includes('declined')).length;
  const volumeReducedCount = exercises.filter((e) => e.adjustmentNote?.includes('Reducing volume')).length;

  if (volumeReducedCount >= 2) {
    sessionNote = 'Multiple exercises hit 2+ sessions of decline. Consider a deload week.';
  } else if (decliningCount >= 3) {
    sessionNote = 'Performance declining across several exercises. If this continues, consider a deload or volume reduction.';
  }

  return { exercises, sessionNote };
}
