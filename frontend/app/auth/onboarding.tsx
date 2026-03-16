import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { apiPost } from '../../src/utils/api';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

type Step = 'basics' | 'body' | 'experience' | 'activity' | 'schedule' | 'goal' | 'nutrition' | 'review';

const STEPS: Step[] = ['basics', 'body', 'experience', 'activity', 'schedule', 'goal', 'nutrition', 'review'];

const NEAT_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.35,
  moderately_active: 1.5,
  very_active: 1.65,
};


export default function Onboarding() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [weight, setWeight] = useState('');
  const [unitPreference, setUnitPreference] = useState<'imperial' | 'metric'>('imperial');
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [goal, setGoal] = useState<'cut' | 'bulk' | 'maintain'>('cut');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetRate, setTargetRate] = useState(0.5);
  const [proteinPerKg, setProteinPerKg] = useState(2.2);
  const [dietStyle, setDietStyle] = useState<'balanced' | 'low_fat' | 'low_carb'>('balanced');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'>('lightly_active');
  const [bodyFatPercent, setBodyFatPercent] = useState('');

  // Macro overrides (empty = use calculated)
  const [overrideCalories, setOverrideCalories] = useState<string>('');
  const [overrideProtein, setOverrideProtein] = useState<string>('');
  const [overrideCarbs, setOverrideCarbs] = useState<string>('');
  const [overrideFat, setOverrideFat] = useState<string>('');

  const currentStep = STEPS[step];

  // Client-side TDEE + macro estimation (mirrors backend logic)
  const calculateEstimatedMacros = () => {
    const weightKg = getWeightKg();
    const heightCm = getHeightCm();

    // Calculate age
    const m = parseInt(birthMonth);
    const d = parseInt(birthDay);
    const y = parseInt(birthYear);
    if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
    const today = new Date();
    let age = today.getFullYear() - y;
    const mDiff = today.getMonth() - (m - 1);
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) age--;

    // BMR: Cunningham if body fat known, else Mifflin-St Jeor
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

    // NEAT multiplier based on daily activity
    const neatMultiplier = NEAT_MULTIPLIERS[activityLevel] || NEAT_MULTIPLIERS.lightly_active;

    // Exercise add-on: ~3.5 kcal/kg/session averaged over 7 days
    const perSession = Math.round(3.5 * weightKg);
    const exerciseAddOn = Math.round((perSession * daysPerWeek) / 7);

    const tdee = Math.round(bmr * neatMultiplier + exerciseAddOn);

    // Calorie target
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

    // Protein
    const proteinG = Math.round(weightKg * proteinPerKg);
    const proteinCals = proteinG * 4;
    const remaining = calories - proteinCals;

    // Carbs and fat by diet style
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
  };

  const getBirthDate = (): string => {
    const m = parseInt(birthMonth);
    const d = parseInt(birthDay);
    const y = parseInt(birthYear);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const validateBirthDate = (): string | null => {
    const m = parseInt(birthMonth);
    const d = parseInt(birthDay);
    const y = parseInt(birthYear);

    if (!birthMonth || !birthDay || !birthYear) return 'Please fill in all date fields';
    if (isNaN(m) || m < 1 || m > 12) return 'Month must be 1-12';
    if (isNaN(d) || d < 1 || d > 31) return 'Day must be 1-31';
    if (isNaN(y) || y < 1920 || y > new Date().getFullYear()) return 'Enter a valid year';

    const date = new Date(y, m - 1, d);
    if (date.getMonth() !== m - 1 || date.getDate() !== d) return 'That date doesn\'t exist';

    const today = new Date();
    let age = today.getFullYear() - y;
    const mDiff = today.getMonth() - (m - 1);
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) age--;
    if (age < 13) return 'You must be at least 13 years old';
    if (age > 120) return 'Please enter a valid birth date';

    return null;
  };

  const validateStep = (): string | null => {
    if (currentStep === 'basics') {
      if (!displayName.trim()) return 'Please enter your name';
      const dateError = validateBirthDate();
      if (dateError) return dateError;
    }
    if (currentStep === 'body') {
      if (unitPreference === 'imperial') {
        if (!heightFeet || isNaN(parseInt(heightFeet))) return 'Please enter your height';
      } else {
        if (!heightFeet || isNaN(parseFloat(heightFeet))) return 'Please enter your height';
      }
      if (!weight || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) return 'Please enter your weight';
    }
    return null;
  };

  const next = () => {
    const error = validateStep();
    if (error) {
      Alert.alert('Hold on', error);
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const getWeightKg = (): number => {
    const w = parseFloat(weight);
    return unitPreference === 'imperial' ? w * 0.453592 : w;
  };

  const getHeightCm = (): number => {
    if (unitPreference === 'imperial') {
      return (parseInt(heightFeet) * 12 + parseInt(heightInches || '0')) * 2.54;
    }
    return parseFloat(heightFeet); // In metric mode, heightFeet is cm
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const body: Record<string, any> = {
        displayName,
        sex,
        birthDate: getBirthDate(),
        heightCm: getHeightCm(),
        weightKg: getWeightKg(),
        experienceLevel,
        unitPreference,
        activityLevel,
        bodyFatPercent: bodyFatPercent ? parseFloat(bodyFatPercent) : undefined,
        daysPerWeek,
        goal,
        targetWeightKg: targetWeight
          ? (unitPreference === 'imperial' ? parseFloat(targetWeight) * 0.453592 : parseFloat(targetWeight))
          : undefined,
        targetRatePerWeek: targetRate,
        proteinPerKg,
        dietStyle,
      };

      // Add macro overrides if user edited any values
      if (overrideCalories) body.overrideCalories = parseInt(overrideCalories);
      if (overrideProtein) body.overrideProteinG = parseInt(overrideProtein);
      if (overrideCarbs) body.overrideCarbsG = parseInt(overrideCarbs);
      if (overrideFat) body.overrideFatG = parseInt(overrideFat);

      const res = await apiPost('/onboarding/complete', body);
      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Error', data.error || 'Onboarding failed');
        return;
      }

      Alert.alert(
        'Profile Set Up!',
        `${data.nutritionPhase.calories} cal/day, now let's set up your training.`,
        [{ text: 'Continue', onPress: async () => {
          await refreshUser();
          router.replace('/training-setup');
        }}]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const OptionButton = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.optionButton, selected && styles.optionButtonSelected]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* STEP: Basics */}
        {currentStep === 'basics' && (
          <View>
            <Text style={styles.stepTitle}>What's your name?</Text>
            <TextInput
              style={styles.input}
              placeholder="Display name"
              placeholderTextColor={COLORS.text_tertiary}
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Text style={styles.stepTitle}>Sex</Text>
            <View style={styles.optionRow}>
              <OptionButton label="Male" selected={sex === 'male'} onPress={() => setSex('male')} />
              <OptionButton label="Female" selected={sex === 'female'} onPress={() => setSex('female')} />
            </View>
            <Text style={styles.stepTitle}>Date of Birth</Text>
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, { flex: 1, textAlign: 'center' }]}
                placeholder="MM"
                placeholderTextColor={COLORS.text_tertiary}
                value={birthMonth}
                onChangeText={(t) => setBirthMonth(t.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <TextInput
                style={[styles.input, { flex: 1, textAlign: 'center' }]}
                placeholder="DD"
                placeholderTextColor={COLORS.text_tertiary}
                value={birthDay}
                onChangeText={(t) => setBirthDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <TextInput
                style={[styles.input, { flex: 1.5, textAlign: 'center' }]}
                placeholder="YYYY"
                placeholderTextColor={COLORS.text_tertiary}
                value={birthYear}
                onChangeText={(t) => setBirthYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>
        )}

        {/* STEP: Body */}
        {currentStep === 'body' && (
          <View>
            <Text style={styles.stepTitle}>Units</Text>
            <View style={styles.optionRow}>
              <OptionButton label="Imperial (lbs/ft)" selected={unitPreference === 'imperial'} onPress={() => setUnitPreference('imperial')} />
              <OptionButton label="Metric (kg/cm)" selected={unitPreference === 'metric'} onPress={() => setUnitPreference('metric')} />
            </View>
            <Text style={styles.stepTitle}>Height</Text>
            {unitPreference === 'imperial' ? (
              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Feet"
                  placeholderTextColor={COLORS.text_tertiary}
                  value={heightFeet}
                  onChangeText={setHeightFeet}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Inches"
                  placeholderTextColor={COLORS.text_tertiary}
                  value={heightInches}
                  onChangeText={setHeightInches}
                  keyboardType="numeric"
                />
              </View>
            ) : (
              <TextInput
                style={styles.input}
                placeholder="Height (cm)"
                placeholderTextColor={COLORS.text_tertiary}
                value={heightFeet}
                onChangeText={setHeightFeet}
                keyboardType="numeric"
              />
            )}
            <Text style={styles.stepTitle}>Weight</Text>
            <TextInput
              style={styles.input}
              placeholder={unitPreference === 'imperial' ? 'Weight (lbs)' : 'Weight (kg)'}
              placeholderTextColor={COLORS.text_tertiary}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
            />
            <Text style={styles.stepTitle}>Body Fat %</Text>
            <Text style={styles.stepSubtitle}>Optional, improves calorie accuracy if you know it</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 15"
              placeholderTextColor={COLORS.text_tertiary}
              value={bodyFatPercent}
              onChangeText={(t) => setBodyFatPercent(t.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* STEP: Experience */}
        {currentStep === 'experience' && (
          <View>
            <Text style={styles.stepTitle}>Experience Level</Text>
            <Text style={styles.stepSubtitle}>This determines your starting training volume</Text>
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.bigOption, experienceLevel === level && styles.bigOptionSelected]}
                onPress={() => setExperienceLevel(level)}
              >
                <Text style={[styles.bigOptionTitle, experienceLevel === level && styles.bigOptionTitleSelected]}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
                <Text style={styles.bigOptionDesc}>
                  {level === 'beginner' && '< 1 year consistent training'}
                  {level === 'intermediate' && '1-3 years consistent training'}
                  {level === 'advanced' && '3+ years, understands periodization'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* STEP: Activity Level */}
        {currentStep === 'activity' && (
          <View>
            <Text style={styles.stepTitle}>Daily Activity Level</Text>
            <Text style={styles.stepSubtitle}>Outside the gym, this is your biggest calorie factor</Text>
            {([
              { value: 'sedentary' as const, label: 'Sedentary', desc: 'Desk job, mostly sitting', steps: '< 5,000 steps/day' },
              { value: 'lightly_active' as const, label: 'Lightly Active', desc: 'Some walking throughout the day', steps: '5,000–8,000 steps/day' },
              { value: 'moderately_active' as const, label: 'Moderately Active', desc: 'On your feet often, regular movement', steps: '8,000–12,000 steps/day' },
              { value: 'very_active' as const, label: 'Very Active', desc: 'Physical job or very active lifestyle', steps: '12,000+ steps/day' },
            ]).map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[styles.bigOption, activityLevel === level.value && styles.bigOptionSelected]}
                onPress={() => setActivityLevel(level.value)}
              >
                <Text style={[styles.bigOptionTitle, activityLevel === level.value && styles.bigOptionTitleSelected]}>
                  {level.label}
                </Text>
                <Text style={styles.bigOptionDesc}>{level.desc}</Text>
                <Text style={{ color: COLORS.text_tertiary, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                  {level.steps}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* STEP: Schedule */}
        {currentStep === 'schedule' && (
          <View>
            <Text style={styles.stepTitle}>How many days per week can you train?</Text>
            <Text style={styles.stepSubtitle}>This affects your calorie calculation and training split options</Text>
            <View style={styles.optionRow}>
              {[3, 4, 5, 6].map((d) => (
                <OptionButton key={d} label={`${d}`} selected={daysPerWeek === d} onPress={() => setDaysPerWeek(d)} />
              ))}
            </View>
          </View>
        )}

        {/* STEP: Goal */}
        {currentStep === 'goal' && (
          <View>
            <Text style={styles.stepTitle}>What's your goal?</Text>
            {(['cut', 'bulk', 'maintain'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.bigOption, goal === g && styles.bigOptionSelected]}
                onPress={() => {
                  setGoal(g);
                  setProteinPerKg(g === 'cut' ? 2.5 : g === 'bulk' ? 2.0 : 2.2);
                }}
              >
                <Text style={[styles.bigOptionTitle, goal === g && styles.bigOptionTitleSelected]}>
                  {g === 'cut' ? 'Cut (Lose Fat)' : g === 'bulk' ? 'Bulk (Build Muscle)' : 'Maintain'}
                </Text>
                <Text style={styles.bigOptionDesc}>
                  {g === 'cut' && 'Calorie deficit to lose body fat while preserving muscle'}
                  {g === 'bulk' && 'Calorie surplus to maximize muscle growth'}
                  {g === 'maintain' && 'Stay at current weight, optimize body composition'}
                </Text>
              </TouchableOpacity>
            ))}
            {goal !== 'maintain' && (
              <>
                <Text style={styles.stepTitle}>Target Weight ({unitPreference === 'imperial' ? 'lbs' : 'kg'})</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Optional"
                  placeholderTextColor={COLORS.text_tertiary}
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  keyboardType="numeric"
                />
                <Text style={styles.stepTitle}>How fast?</Text>
                {(goal === 'cut'
                  ? [
                      { rate: 0.3, label: 'Gradual', desc: 'Easier to stick with, best for muscle retention' },
                      { rate: 0.5, label: 'Moderate', desc: 'Recommended for most people' },
                      { rate: 0.75, label: 'Aggressive', desc: 'Faster results, harder to sustain' },
                      { rate: 1.0, label: 'Very Aggressive', desc: 'Maximum pace, risk of muscle loss' },
                    ]
                  : [
                      { rate: 0.15, label: 'Lean Bulk', desc: 'Minimal fat gain, slower muscle growth' },
                      { rate: 0.25, label: 'Moderate', desc: 'Good balance of muscle gain and leanness' },
                      { rate: 0.35, label: 'Aggressive', desc: 'Maximum muscle growth, some fat gain' },
                    ]
                ).map((option) => {
                  const w = parseFloat(weight) || 180;
                  const weightInLbs = unitPreference === 'imperial' ? w : w * 2.205;
                  const lbsPerWeek = (option.rate / 100) * weightInLbs;
                  const lbsLabel = unitPreference === 'imperial'
                    ? `~${lbsPerWeek.toFixed(1)} lb/week`
                    : `~${(lbsPerWeek / 2.205).toFixed(1)} kg/week`;

                  return (
                    <TouchableOpacity
                      key={option.rate}
                      style={[styles.bigOption, targetRate === option.rate && styles.bigOptionSelected]}
                      onPress={() => setTargetRate(option.rate)}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.bigOptionTitle, targetRate === option.rate && styles.bigOptionTitleSelected]}>
                          {option.label}
                        </Text>
                        <Text style={{ color: COLORS.text_tertiary, fontSize: 11 }}>{option.rate}% BW/week</Text>
                      </View>
                      <Text style={styles.bigOptionDesc}>{option.desc}</Text>
                      <Text style={{ color: COLORS.accent_light, fontSize: 13, fontWeight: '600', marginTop: 4 }}>
                        {lbsLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* STEP: Nutrition */}
        {currentStep === 'nutrition' && (
          <View>
            <Text style={styles.stepTitle}>Protein Target</Text>
            <Text style={[styles.stepSubtitle, { color: COLORS.accent_light }]}>
              {goal === 'cut'
                ? 'You\'re cutting, higher protein helps preserve muscle in a deficit'
                : goal === 'bulk'
                ? 'You\'re bulking, moderate protein is sufficient in a surplus'
                : 'For maintenance, a standard-to-high range works well for most lifters'}
            </Text>
            {[
              { value: 1.8, label: 'Moderate' },
              { value: 2.0, label: 'Standard' },
              { value: 2.2, label: 'High' },
              { value: 2.5, label: 'Very High' },
            ].map((p) => {
              const isRecommended =
                (goal === 'cut' && p.value === 2.5) ||
                (goal === 'bulk' && p.value === 2.0) ||
                (goal === 'maintain' && p.value === 2.2);
              const w = parseFloat(weight) || 180;
              const weightKg = unitPreference === 'imperial' ? w * 0.453592 : w;
              const totalG = Math.round(weightKg * p.value);
              const gPerLb = (p.value / 2.205).toFixed(2);

              return (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.bigOption, proteinPerKg === p.value && styles.bigOptionSelected]}
                  onPress={() => setProteinPerKg(p.value)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.bigOptionTitle, proteinPerKg === p.value && styles.bigOptionTitleSelected]}>
                      {p.label}{isRecommended ? ' (recommended)' : ''}
                    </Text>
                    <Text style={{ color: COLORS.text_tertiary, fontSize: 11 }}>
                      {p.value}g/kg · {gPerLb}g/lb
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.accent_light, fontSize: 13, fontWeight: '600', marginTop: 4 }}>
                    ~{totalG}g protein/day
                  </Text>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.stepTitle}>Carb / Fat Preference</Text>
            <Text style={styles.stepSubtitle}>
              With protein and calories set, all options produce similar results. Pick based on the foods you enjoy.
            </Text>
            {([
              {
                value: 'balanced' as const,
                label: 'Balanced',
                tag: 'Recommended',
                desc: 'Equal split between carbs and fat. Most flexible, works for everyone.',
                foods: 'All foods fit easily',
              },
              {
                value: 'low_fat' as const,
                label: 'Higher Carb',
                tag: null,
                desc: 'More carbs, less fat. Fuels high-volume training sessions.',
                foods: 'Rice, pasta, bread, potatoes, fruit',
              },
              {
                value: 'low_carb' as const,
                label: 'Higher Fat',
                tag: null,
                desc: 'More fat, fewer carbs. Can improve satiety on a cut.',
                foods: 'Meat, cheese, nuts, avocado, oils',
              },
            ]).map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[styles.bigOption, dietStyle === d.value && styles.bigOptionSelected]}
                onPress={() => setDietStyle(d.value)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.bigOptionTitle, dietStyle === d.value && styles.bigOptionTitleSelected]}>
                    {d.label}
                  </Text>
                  {d.tag && (
                    <View style={{ backgroundColor: COLORS.accent_subtle, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: COLORS.accent_light, fontSize: 10, fontWeight: '600' }}>{d.tag}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.bigOptionDesc}>{d.desc}</Text>
                <Text style={{ color: COLORS.text_tertiary, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                  {d.foods}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* STEP: Review */}
        {currentStep === 'review' && (() => {
          const estimated = calculateEstimatedMacros();
          const displayCals = overrideCalories || String(estimated?.calories ?? '—');
          const displayProtein = overrideProtein || String(estimated?.proteinG ?? '—');
          const displayCarbs = overrideCarbs || String(estimated?.carbsG ?? '—');
          const displayFat = overrideFat || String(estimated?.fatG ?? '—');

          return (
            <View>
              <Text style={styles.stepTitle}>Review Your Setup</Text>
              <View style={styles.reviewCard}>
                <ReviewRow label="Name" value={displayName} />
                <ReviewRow label="Goal" value={goal.charAt(0).toUpperCase() + goal.slice(1)} />
                <ReviewRow label="Activity" value={activityLevel.replace(/_/g, ' ')} />
                <ReviewRow label="Days/Week" value={`${daysPerWeek}`} />
                <ReviewRow label="Experience" value={experienceLevel} />
                <ReviewRow label="Protein" value={unitPreference === 'imperial' ? `${(proteinPerKg / 2.205).toFixed(2)}g/lb` : `${proteinPerKg}g/kg`} />
                <ReviewRow label="Diet Style" value={dietStyle === 'balanced' ? 'Balanced' : dietStyle === 'low_fat' ? 'Higher Carb' : 'Higher Fat'} />
              </View>

              <Text style={styles.stepTitle}>Your Daily Macros</Text>
              <Text style={styles.stepSubtitle}>
                Calculated from your stats. Edit any value to override.
              </Text>
              {estimated && (
                <Text style={{ color: COLORS.text_tertiary, fontSize: 12, marginBottom: SPACING.md, marginTop: -SPACING.sm }}>
                  Estimated TDEE: {estimated.tdee} cal
                </Text>
              )}
              <View style={styles.macroGrid}>
                <View style={styles.macroField}>
                  <Text style={styles.macroLabel}>Calories</Text>
                  <TextInput
                    style={[styles.macroInput, overrideCalories ? styles.macroInputOverridden : null]}
                    value={displayCals}
                    onChangeText={(t) => {
                      const cal = t.replace(/[^0-9]/g, '');
                      setOverrideCalories(cal);
                      // Recalculate carbs & fat from new calorie total
                      const calNum = parseInt(cal);
                      if (calNum > 0 && estimated) {
                        const protG = overrideProtein ? parseInt(overrideProtein) : estimated.proteinG;
                        const remaining = calNum - protG * 4;
                        if (remaining > 0) {
                          const weightKg = getWeightKg();
                          let newFat: number;
                          let newCarbs: number;
                          if (dietStyle === 'low_fat') {
                            newFat = Math.round(weightKg * 0.8);
                            newCarbs = Math.round((remaining - newFat * 9) / 4);
                          } else if (dietStyle === 'low_carb') {
                            newCarbs = Math.round(weightKg * 2.0);
                            newFat = Math.round((remaining - newCarbs * 4) / 9);
                          } else {
                            newFat = Math.round((remaining * 0.3) / 9);
                            newCarbs = Math.round((remaining * 0.7) / 4);
                          }
                          newFat = Math.max(newFat, Math.round(weightKg * 0.6));
                          newCarbs = Math.max(newCarbs, Math.round(weightKg * 1.5));
                          setOverrideCarbs(String(newCarbs));
                          setOverrideFat(String(newFat));
                        }
                      }
                    }}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.macroUnit}>cal</Text>
                </View>
                <View style={styles.macroField}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <TextInput
                    style={[styles.macroInput, overrideProtein ? styles.macroInputOverridden : null]}
                    value={displayProtein}
                    onChangeText={(t) => {
                      const prot = t.replace(/[^0-9]/g, '');
                      setOverrideProtein(prot);
                      // Recalculate carbs & fat from updated protein
                      const protNum = parseInt(prot);
                      if (protNum > 0 && estimated) {
                        const calNum = overrideCalories ? parseInt(overrideCalories) : estimated.calories;
                        const remaining = calNum - protNum * 4;
                        if (remaining > 0) {
                          const weightKg = getWeightKg();
                          let newFat: number;
                          let newCarbs: number;
                          if (dietStyle === 'low_fat') {
                            newFat = Math.round(weightKg * 0.8);
                            newCarbs = Math.round((remaining - newFat * 9) / 4);
                          } else if (dietStyle === 'low_carb') {
                            newCarbs = Math.round(weightKg * 2.0);
                            newFat = Math.round((remaining - newCarbs * 4) / 9);
                          } else {
                            newFat = Math.round((remaining * 0.3) / 9);
                            newCarbs = Math.round((remaining * 0.7) / 4);
                          }
                          newFat = Math.max(newFat, Math.round(weightKg * 0.6));
                          newCarbs = Math.max(newCarbs, Math.round(weightKg * 1.5));
                          setOverrideCarbs(String(newCarbs));
                          setOverrideFat(String(newFat));
                        }
                      }
                    }}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.macroUnit}>g</Text>
                </View>
                <View style={styles.macroField}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <TextInput
                    style={[styles.macroInput, overrideCarbs ? styles.macroInputOverridden : null]}
                    value={displayCarbs}
                    onChangeText={(t) => setOverrideCarbs(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.macroUnit}>g</Text>
                </View>
                <View style={styles.macroField}>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <TextInput
                    style={[styles.macroInput, overrideFat ? styles.macroInputOverridden : null]}
                    value={displayFat}
                    onChangeText={(t) => setOverrideFat(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.macroUnit}>g</Text>
                </View>
              </View>
              {(overrideCalories || overrideProtein || overrideCarbs || overrideFat) && (
                <TouchableOpacity
                  style={{ alignSelf: 'center', marginTop: SPACING.md }}
                  onPress={() => {
                    setOverrideCalories('');
                    setOverrideProtein('');
                    setOverrideCarbs('');
                    setOverrideFat('');
                  }}
                >
                  <Text style={{ color: COLORS.text_tertiary, fontSize: 13 }}>Reset to calculated values</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        {step > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={back}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
          onPress={currentStep === 'review' ? handleSubmit : next}
          disabled={isSubmitting}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === 'review'
              ? (isSubmitting ? 'Setting up...' : 'Start Training')
              : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg_primary,
  },
  progressContainer: {
    height: 3,
    backgroundColor: COLORS.bg_input,
    marginHorizontal: SPACING.xl,
    borderRadius: 2,
    marginTop: SPACING.sm,
  },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.accent_primary,
    borderRadius: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xl,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text_primary,
    marginBottom: SPACING.md,
    marginTop: SPACING.xl,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.text_secondary,
    marginBottom: SPACING.lg,
    marginTop: -SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    fontSize: 16,
    color: COLORS.text_primary,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  optionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  optionButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.accent_subtle,
    borderColor: COLORS.accent_muted,
  },
  optionText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: COLORS.accent_light,
  },
  bigOption: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.sm,
  },
  bigOptionSelected: {
    backgroundColor: COLORS.accent_subtle,
    borderColor: COLORS.accent_muted,
  },
  bigOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text_primary,
  },
  bigOptionTitleSelected: {
    color: COLORS.accent_light,
  },
  bigOptionDesc: {
    fontSize: 13,
    color: COLORS.text_tertiary,
    marginTop: 4,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  macroField: {
    flex: 1,
    minWidth: '45%' as any,
    alignItems: 'center' as const,
  },
  macroLabel: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  macroInput: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.text_primary,
    textAlign: 'center' as const,
    width: '100%' as any,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  macroInputOverridden: {
    borderColor: COLORS.accent_muted,
    backgroundColor: COLORS.accent_subtle,
  },
  macroUnit: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border_subtle,
  },
  reviewLabel: {
    fontSize: 14,
    color: COLORS.text_secondary,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text_primary,
    textTransform: 'capitalize',
  },
  navRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  backButton: {
    flex: 1,
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backButtonText: {
    color: COLORS.text_secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
  },
  nextButtonText: {
    color: COLORS.text_on_accent,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
