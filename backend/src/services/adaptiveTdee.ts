import prisma from '../utils/prisma';

// ============================================================
// Adaptive TDEE Engine
// Based on energy balance: TDEE = Intake - (Weight Change × 7700 / 7)
// Uses exponential moving average for weight smoothing
// Blends formula estimate with adaptive estimate over 2-4 weeks
// ============================================================

const KCAL_PER_KG = 7700; // ~7700 kcal per kg of body weight change
const MIN_DAYS_FOR_ADAPTATION = 14; // Need at least 2 weeks of data
const FULL_CONFIDENCE_DAYS = 28; // Full trust in adaptive TDEE at 4 weeks
const EMA_ALPHA = 0.1; // Smoothing factor for exponential moving average

/**
 * Calculate exponential moving average for weight data.
 * Filters out daily fluctuations (water, sodium, etc.)
 */
export function smoothWeights(
  weights: { date: Date; weightKg: number }[]
): { date: Date; smoothed: number }[] {
  if (weights.length === 0) return [];

  const sorted = [...weights].sort((a, b) => a.date.getTime() - b.date.getTime());
  const result: { date: Date; smoothed: number }[] = [];

  let ema = sorted[0].weightKg;
  for (const entry of sorted) {
    ema = EMA_ALPHA * entry.weightKg + (1 - EMA_ALPHA) * ema;
    result.push({ date: entry.date, smoothed: Math.round(ema * 100) / 100 });
  }

  return result;
}

/**
 * Calculate adaptive TDEE from logged intake and weight trends.
 * Returns null if not enough data.
 */
export async function calculateAdaptiveTdee(
  userId: string,
  windowDays: number = 28
): Promise<{
  adaptiveTdee: number;
  confidence: number;
  avgIntake: number;
  weightChangeKg: number;
  daysOfData: number;
  smoothedStartWeight: number;
  smoothedEndWeight: number;
} | null> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  // Get weight entries in window
  const weights = await prisma.bodyWeight.findMany({
    where: {
      userId,
      date: { gte: windowStart },
    },
    orderBy: { date: 'asc' },
  });

  if (weights.length < 4) return null; // Need minimum weight entries

  // Get nutrition logs in window
  const nutritionLogs = await prisma.nutritionLog.findMany({
    where: {
      userId,
      date: { gte: windowStart },
    },
  });

  // Calculate days with nutrition data
  const loggedDates = new Set(
    nutritionLogs.map((l) => l.date.toISOString().split('T')[0])
  );
  const daysLogged = loggedDates.size;

  if (daysLogged < MIN_DAYS_FOR_ADAPTATION) return null;

  // Average daily calorie intake
  const totalCalories = nutritionLogs.reduce((sum, l) => sum + l.calories, 0);
  const avgIntake = Math.round(totalCalories / daysLogged);

  // Smooth weight data
  const smoothed = smoothWeights(weights);
  const smoothedStartWeight = smoothed[0].smoothed;
  const smoothedEndWeight = smoothed[smoothed.length - 1].smoothed;

  // Time span in days between first and last weight
  const daySpan = Math.max(
    1,
    (smoothed[smoothed.length - 1].date.getTime() - smoothed[0].date.getTime()) / 86400000
  );

  // Weight change rate (kg per day)
  const weightChangeKg = smoothedEndWeight - smoothedStartWeight;
  const dailyWeightChange = weightChangeKg / daySpan;

  // Energy balance equation:
  // TDEE = Intake - (daily weight change in kg × 7700)
  const adaptiveTdee = Math.round(avgIntake - dailyWeightChange * KCAL_PER_KG);

  // Confidence: ramps from 0 to 1 over MIN_DAYS to FULL_CONFIDENCE days
  const confidence = Math.min(
    1,
    Math.max(0, (daysLogged - MIN_DAYS_FOR_ADAPTATION) / (FULL_CONFIDENCE_DAYS - MIN_DAYS_FOR_ADAPTATION))
  );

  return {
    adaptiveTdee: Math.max(1000, Math.min(6000, adaptiveTdee)), // Guardrails
    confidence,
    avgIntake,
    weightChangeKg,
    daysOfData: daysLogged,
    smoothedStartWeight,
    smoothedEndWeight,
  };
}

/**
 * Get the best TDEE estimate — blends formula and adaptive.
 * As confidence increases, relies more on adaptive.
 */
export function blendTdee(
  formulaTdee: number,
  adaptiveTdee: number | null,
  confidence: number
): number {
  if (adaptiveTdee === null || confidence === 0) return formulaTdee;

  // Linear blend: more adaptive data = more trust in adaptive
  const blended = Math.round(
    formulaTdee * (1 - confidence) + adaptiveTdee * confidence
  );
  return blended;
}

/**
 * Run adaptive update for a user's nutrition phase.
 * Called during weekly check-in.
 */
export async function runAdaptiveUpdate(userId: string): Promise<{
  previousTdee: number;
  newTdee: number;
  adaptiveResult: Awaited<ReturnType<typeof calculateAdaptiveTdee>>;
  macroAdjustment: { calories: number; proteinG: number; carbsG: number; fatG: number } | null;
} | null> {
  const phase = await prisma.nutritionPhase.findFirst({
    where: { userId, status: 'active' },
  });
  if (!phase) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const adaptiveResult = await calculateAdaptiveTdee(userId);
  const formulaTdee = phase.estimatedTdee || phase.currentCalories;
  const previousTdee = phase.adaptiveTdee || formulaTdee;

  if (!adaptiveResult) {
    return { previousTdee, newTdee: previousTdee, adaptiveResult: null, macroAdjustment: null };
  }

  const newTdee = blendTdee(formulaTdee, adaptiveResult.adaptiveTdee, adaptiveResult.confidence);

  // Only adjust macros if TDEE changed by more than 50 kcal
  let macroAdjustment = null;
  if (Math.abs(newTdee - previousTdee) > 50) {
    // Recalculate calories based on goal
    let targetCalories: number;
    if (phase.phaseType === 'cut') {
      const rate = phase.targetRatePerWeek || 0.5;
      const latestWeight = await prisma.bodyWeight.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
      });
      const currentWeight = latestWeight?.weightKg || phase.startWeightKg;
      const deficit = Math.round(rate * currentWeight * 7.7 * 10) / 10;
      targetCalories = Math.round(newTdee - Math.min(deficit, 750));
    } else if (phase.phaseType === 'bulk') {
      const rate = phase.targetRatePerWeek || 0.25;
      const latestWeight = await prisma.bodyWeight.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
      });
      const currentWeight = latestWeight?.weightKg || phase.startWeightKg;
      const surplus = Math.round(rate * currentWeight * 7.7 * 10) / 10;
      targetCalories = Math.round(newTdee + Math.min(surplus, 500));
    } else {
      targetCalories = newTdee;
    }

    const latestWeight = await prisma.bodyWeight.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    const weightKg = latestWeight?.weightKg || phase.startWeightKg;
    const proteinG = Math.round(weightKg * phase.proteinPerKg);
    const proteinCals = proteinG * 4;
    const remaining = targetCalories - proteinCals;

    let fatG: number;
    let carbsG: number;
    if (phase.dietStyle === 'low_fat') {
      fatG = Math.round(weightKg * 0.8);
      carbsG = Math.round((remaining - fatG * 9) / 4);
    } else if (phase.dietStyle === 'low_carb') {
      carbsG = Math.round(weightKg * 2.0);
      fatG = Math.round((remaining - carbsG * 4) / 9);
    } else {
      fatG = Math.round((remaining * 0.3) / 9);
      carbsG = Math.round((remaining * 0.7) / 4);
    }
    fatG = Math.max(fatG, Math.round(weightKg * 0.6));
    carbsG = Math.max(carbsG, Math.round(weightKg * 1.5));

    macroAdjustment = { calories: targetCalories, proteinG, carbsG, fatG };

    // Update the nutrition phase
    await prisma.nutritionPhase.update({
      where: { id: phase.id },
      data: {
        adaptiveTdee: newTdee,
        tdeeConfidence: adaptiveResult.confidence,
        currentCalories: targetCalories,
        currentProteinG: proteinG,
        currentCarbsG: carbsG,
        currentFatG: fatG,
      },
    });
  } else {
    // Just update the adaptive tracking fields
    await prisma.nutritionPhase.update({
      where: { id: phase.id },
      data: {
        adaptiveTdee: newTdee,
        tdeeConfidence: adaptiveResult.confidence,
      },
    });
  }

  return { previousTdee, newTdee, adaptiveResult, macroAdjustment };
}
