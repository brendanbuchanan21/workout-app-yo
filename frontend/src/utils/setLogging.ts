export const kgToLbs = (kg: number): number => Math.round(kg * 2.20462);

export const estimateSetValues = (
  completedSets: any[],
  setIdx: number,
  targetRir: number,
): { weight: string; reps: string; rir: string } => {
  const firstSet = completedSets[0];
  const set1Reps = firstSet.actualReps;

  const failureRetention = [1.0, 0.70, 0.55, 0.50, 0.45];
  const rirModifier: Record<number, number> = { 0: 1.0, 1: 0.73, 2: 0.55, 3: 0.45 };
  const modifier = rirModifier[Math.min(targetRir, 3)] ?? 0.45;

  const setPosition = setIdx;
  const retentionAtFailure = failureRetention[Math.min(setPosition, failureRetention.length - 1)];
  const dropOff = 1 - retentionAtFailure;
  const adjustedRetention = 1 - (dropOff * modifier);

  const lastDone = completedSets[completedSets.length - 1];
  const weight = lastDone.actualWeightKg != null ? String(kgToLbs(lastDone.actualWeightKg)) : '';
  const estimatedReps = set1Reps != null ? Math.max(1, Math.round(set1Reps * adjustedRetention)) : null;
  const reps = estimatedReps != null ? String(estimatedReps) : '';
  const rir = targetRir != null ? String(targetRir) : '';

  return { weight, reps, rir };
};
