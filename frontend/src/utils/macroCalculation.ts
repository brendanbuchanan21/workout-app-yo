const NEAT_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.35,
  moderately_active: 1.5,
  very_active: 1.65,
};

interface MacroInput {
  weightKg: number;
  heightCm: number;
  sex: 'male' | 'female';
  birthMonth: number;
  birthDay: number;
  birthYear: number;
  bodyFatPercent: string;
  activityLevel: string;
  daysPerWeek: number;
  goal: 'cut' | 'bulk' | 'maintain';
  targetRate: number;
  proteinPerKg: number;
  dietStyle: 'balanced' | 'low_fat' | 'low_carb';
}

interface MacroResult {
  tdee: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function calculateEstimatedMacros(input: MacroInput): MacroResult | null {
  const {
    weightKg, heightCm, sex, birthMonth, birthDay, birthYear,
    bodyFatPercent, activityLevel, daysPerWeek, goal, targetRate,
    proteinPerKg, dietStyle,
  } = input;

  if (isNaN(birthMonth) || isNaN(birthDay) || isNaN(birthYear)) return null;
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  const mDiff = today.getMonth() - (birthMonth - 1);
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < birthDay)) age--;

  let bmr: number;
  const bf = parseFloat(bodyFatPercent);
  if (!isNaN(bf) && bf > 0) {
    const leanMassKg = weightKg * (1 - bf / 100);
    bmr = Math.round(370 + 21.6 * leanMassKg);
  } else if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  const neatMultiplier = NEAT_MULTIPLIERS[activityLevel] || NEAT_MULTIPLIERS.lightly_active;

  const perSession = Math.round(3.5 * weightKg);
  const exerciseAddOn = Math.round((perSession * daysPerWeek) / 7);

  const tdee = Math.round(bmr * neatMultiplier + exerciseAddOn);

  let calories: number;
  if (goal === 'cut') {
    const deficitPercent = targetRate ? Math.min(targetRate, 1.0) : 0.5;
    const deficit = Math.round(deficitPercent * weightKg * 7.7 * 10) / 10;
    calories = Math.round(tdee - Math.min(deficit, 750));
  } else if (goal === 'bulk') {
    const surplusPercent = targetRate ? Math.min(targetRate, 0.5) : 0.25;
    const surplus = Math.round(surplusPercent * weightKg * 7.7 * 10) / 10;
    calories = Math.round(tdee + Math.min(surplus, 500));
  } else {
    calories = tdee;
  }

  const proteinG = Math.round(weightKg * proteinPerKg);
  const proteinCals = proteinG * 4;
  const remaining = calories - proteinCals;

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

  fatG = Math.max(fatG, Math.round(weightKg * 0.6));
  carbsG = Math.max(carbsG, Math.round(weightKg * 1.5));

  return { tdee, calories, proteinG, carbsG, fatG };
}

export function recalcCarbsFat(
  calories: number,
  proteinG: number,
  weightKg: number,
  dietStyle: 'balanced' | 'low_fat' | 'low_carb',
): { carbsG: number; fatG: number } {
  const remaining = calories - proteinG * 4;
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
  fatG = Math.max(fatG, Math.round(weightKg * 0.6));
  carbsG = Math.max(carbsG, Math.round(weightKg * 1.5));
  return { carbsG, fatG };
}

export function getWeightKg(weight: string, unitPreference: 'imperial' | 'metric'): number {
  const w = parseFloat(weight);
  return unitPreference === 'imperial' ? w * 0.453592 : w;
}

export function getHeightCm(
  heightFeet: string,
  heightInches: string,
  unitPreference: 'imperial' | 'metric',
): number {
  if (unitPreference === 'imperial') {
    return (parseInt(heightFeet) * 12 + parseInt(heightInches || '0')) * 2.54;
  }
  return parseFloat(heightFeet);
}

export function getBirthDate(birthMonth: string, birthDay: string, birthYear: string): string {
  const m = parseInt(birthMonth);
  const d = parseInt(birthDay);
  const y = parseInt(birthYear);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
