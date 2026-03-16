import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const onboardingSchema = z.object({
  displayName: z.string().min(1),
  sex: z.enum(['male', 'female']),
  birthDate: z.string(),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  bodyFatPercent: z.number().min(3).max(60).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  unitPreference: z.enum(['imperial', 'metric']),
  activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active']),
  daysPerWeek: z.number().int().min(3).max(6),
  goal: z.enum(['cut', 'bulk', 'maintain']),
  targetWeightKg: z.number().positive().optional(),
  targetRatePerWeek: z.number().optional(),
  proteinPerKg: z.number().min(1.6).max(3.3).default(2.2),
  dietStyle: z.enum(['balanced', 'low_fat', 'low_carb']).default('balanced'),
  // Optional macro overrides — if provided, skip auto-calculation
  overrideCalories: z.number().int().min(800).max(8000).optional(),
  overrideProteinG: z.number().int().min(50).max(500).optional(),
  overrideCarbsG: z.number().int().min(0).max(1000).optional(),
  overrideFatG: z.number().int().min(20).max(500).optional(),
});

// ============================================================
// Evidence-based TDEE calculation
// Sources: Mifflin-St Jeor (general), Cunningham (athletes),
// NEAT multipliers from step/activity research,
// EAT as additive component (not multiplicative)
// ============================================================

// NEAT multiplier based on daily activity outside the gym
const NEAT_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,        // Desk job, <5k steps
  lightly_active: 1.35,  // Some walking, 5-8k steps
  moderately_active: 1.5, // On feet often, 8-12k steps
  very_active: 1.65,     // Physical job, 12k+ steps
};

// Exercise add-on: average daily kcal from resistance training
// Based on ~250-350 kcal per session averaged over 7 days
function getExerciseAddOn(daysPerWeek: number, weightKg: number): number {
  // Heavier individuals burn more per session
  // Base: ~5 kcal/kg/session for resistance training (conservative)
  const perSession = Math.round(3.5 * weightKg);
  return Math.round((perSession * daysPerWeek) / 7);
}

function calculateBMR(
  sex: string,
  weightKg: number,
  heightCm: number,
  ageYears: number,
  bodyFatPercent?: number
): { bmr: number; method: string } {
  // If body fat % is known, use Cunningham (more accurate for athletes)
  if (bodyFatPercent) {
    const leanMassKg = weightKg * (1 - bodyFatPercent / 100);
    return {
      bmr: Math.round(370 + 21.6 * leanMassKg),
      method: 'cunningham',
    };
  }

  // Otherwise use Mifflin-St Jeor (most accurate for general population)
  let bmr: number;
  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  }
  return { bmr: Math.round(bmr), method: 'mifflin_st_jeor' };
}

function calculateTDEE(
  sex: string,
  weightKg: number,
  heightCm: number,
  ageYears: number,
  activityLevel: string,
  daysPerWeek: number,
  bodyFatPercent?: number
): { tdee: number; bmr: number; bmrMethod: string; neatMultiplier: number; exerciseAddOn: number } {
  const { bmr, method } = calculateBMR(sex, weightKg, heightCm, ageYears, bodyFatPercent);
  const neatMultiplier = NEAT_MULTIPLIERS[activityLevel] || NEAT_MULTIPLIERS.lightly_active;
  const exerciseAddOn = getExerciseAddOn(daysPerWeek, weightKg);
  const tdee = Math.round(bmr * neatMultiplier + exerciseAddOn);

  return { tdee, bmr, bmrMethod: method, neatMultiplier, exerciseAddOn };
}

function calculateMacros(
  goal: string,
  tdee: number,
  weightKg: number,
  proteinPerKg: number,
  dietStyle: string,
  targetRate?: number
) {
  // Calculate calorie target
  let calories: number;
  if (goal === 'cut') {
    const deficitPercent = targetRate ? Math.min(targetRate, 1.0) : 0.5;
    // ~7.7 kcal per gram of body weight change
    const deficit = Math.round(deficitPercent * weightKg * 7.7 * 10) / 10;
    calories = Math.round(tdee - Math.min(deficit, 750));
  } else if (goal === 'bulk') {
    const surplusPercent = targetRate ? Math.min(targetRate, 0.5) : 0.25;
    const surplus = Math.round(surplusPercent * weightKg * 7.7 * 10) / 10;
    calories = Math.round(tdee + Math.min(surplus, 500));
  } else {
    calories = tdee;
  }

  // Protein fixed by bodyweight
  const proteinG = Math.round(weightKg * proteinPerKg);
  const proteinCals = proteinG * 4;
  const remaining = calories - proteinCals;

  // Split remaining between carbs and fat by diet style
  let fatG: number;
  let carbsG: number;

  if (dietStyle === 'low_fat') {
    fatG = Math.round(weightKg * 0.8);
    carbsG = Math.round((remaining - fatG * 9) / 4);
  } else if (dietStyle === 'low_carb') {
    carbsG = Math.round(weightKg * 2.0);
    fatG = Math.round((remaining - carbsG * 4) / 9);
  } else {
    fatG = Math.round((remaining * 0.3) / 9);
    carbsG = Math.round((remaining * 0.7) / 4);
  }

  // Ensure minimums
  fatG = Math.max(fatG, Math.round(weightKg * 0.6));
  carbsG = Math.max(carbsG, Math.round(weightKg * 1.5));

  return { calories, proteinG, carbsG, fatG };
}

router.post('/complete', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = onboardingSchema.parse(req.body);

    // Calculate age
    const birth = new Date(data.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

    const tdeeResult = calculateTDEE(
      data.sex, data.weightKg, data.heightCm, age,
      data.activityLevel, data.daysPerWeek, data.bodyFatPercent
    );
    const calculatedMacros = calculateMacros(
      data.goal, tdeeResult.tdee, data.weightKg,
      data.proteinPerKg, data.dietStyle, data.targetRatePerWeek
    );
    // Use overrides if provided, otherwise use calculated values
    const macros = {
      calories: data.overrideCalories ?? calculatedMacros.calories,
      proteinG: data.overrideProteinG ?? calculatedMacros.proteinG,
      carbsG: data.overrideCarbsG ?? calculatedMacros.carbsG,
      fatG: data.overrideFatG ?? calculatedMacros.fatG,
    };

    // Update user profile and create nutrition phase
    const [user, nutritionPhase] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId },
        data: {
          displayName: data.displayName,
          sex: data.sex,
          birthDate: new Date(data.birthDate),
          heightCm: data.heightCm,
          experienceLevel: data.experienceLevel,
          daysPerWeek: data.daysPerWeek,
          activityLevel: data.activityLevel,
          bodyFatPercent: data.bodyFatPercent,
          unitPreference: data.unitPreference,
        },
      }),
      prisma.nutritionPhase.create({
        data: {
          userId: req.userId!,
          phaseType: data.goal === 'cut' ? 'cut' : data.goal === 'bulk' ? 'bulk' : 'maintain',
          startDate: new Date(),
          startWeightKg: data.weightKg,
          targetWeightKg: data.targetWeightKg,
          targetRatePerWeek: data.targetRatePerWeek,
          currentCalories: macros.calories,
          currentProteinG: macros.proteinG,
          currentCarbsG: macros.carbsG,
          currentFatG: macros.fatG,
          proteinPerKg: data.proteinPerKg,
          dietStyle: data.dietStyle,
          estimatedTdee: tdeeResult.tdee,
        },
      }),
    ]);

    // Log initial weight
    await prisma.bodyWeight.upsert({
      where: {
        userId_date: { userId: req.userId!, date: new Date(new Date().toISOString().split('T')[0]) },
      },
      update: { weightKg: data.weightKg },
      create: {
        userId: req.userId!,
        date: new Date(new Date().toISOString().split('T')[0]),
        weightKg: data.weightKg,
      },
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        experienceLevel: user.experienceLevel,
      },
      nutritionPhase: {
        phaseType: nutritionPhase.phaseType,
        calories: nutritionPhase.currentCalories,
        proteinG: nutritionPhase.currentProteinG,
        carbsG: nutritionPhase.currentCarbsG,
        fatG: nutritionPhase.currentFatG,
      },
      tdee: {
        total: tdeeResult.tdee,
        bmr: tdeeResult.bmr,
        bmrMethod: tdeeResult.bmrMethod,
        neatMultiplier: tdeeResult.neatMultiplier,
        exerciseAddOn: tdeeResult.exerciseAddOn,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
