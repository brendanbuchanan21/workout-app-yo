import { useState } from 'react';
import {
  View,
  Text,
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
// NUTRITION_HIDDEN: calculateEstimatedMacros import removed
import { getWeightKg, getHeightCm, getBirthDate } from '../../src/utils/macroCalculation';
import { validateBasicsStep, validateBodyStep } from '../../src/utils/onboardingValidation';
import BasicInfoStep from '../../src/components/Onboarding/BasicInfoStep';
import BodyMetricsStep from '../../src/components/Onboarding/BodyMetricsStep';
import { ExperienceStep, ActivityStep, ScheduleStep } from '../../src/components/Onboarding/TrainingPrefsSteps';
// NUTRITION_HIDDEN: GoalStep, NutritionStep, ReviewStep imports removed
// import { GoalStep, NutritionStep } from '../../src/components/Onboarding/GoalNutritionStep';
// import ReviewStep from '../../src/components/Onboarding/ReviewStep';

// NUTRITION_HIDDEN: removed 'goal', 'nutrition', 'review' steps
type Step = 'basics' | 'body' | 'experience' | 'activity' | 'schedule';

const STEPS: Step[] = ['basics', 'body', 'experience', 'activity', 'schedule'];

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
  // NUTRITION_HIDDEN: goal, targetWeight, targetRate, proteinPerKg, dietStyle, override states removed
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'>('lightly_active');
  const [bodyFatPercent, setBodyFatPercent] = useState('');

  const currentStep = STEPS[step];
  const weightKg = getWeightKg(weight, unitPreference);
  const heightCm = getHeightCm(heightFeet, heightInches, unitPreference);

  const validateStep = (): string | null => {
    if (currentStep === 'basics') {
      return validateBasicsStep(displayName, birthMonth, birthDay, birthYear);
    }
    if (currentStep === 'body') {
      return validateBodyStep(heightFeet, weight, unitPreference);
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // NUTRITION_HIDDEN: hardcoded nutrition defaults
      const body: Record<string, any> = {
        displayName,
        sex,
        birthDate: getBirthDate(birthMonth, birthDay, birthYear),
        heightCm,
        weightKg,
        experienceLevel,
        unitPreference,
        activityLevel,
        bodyFatPercent: bodyFatPercent ? parseFloat(bodyFatPercent) : undefined,
        daysPerWeek,
        goal: 'maintain',
        proteinPerKg: 2.2,
        dietStyle: 'balanced',
      };

      const res = await apiPost('/onboarding/complete', body);
      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Error', data.error || 'Onboarding failed');
        return;
      }

      // NUTRITION_HIDDEN: removed calorie mention from alert
      Alert.alert(
        'Profile Set Up!',
        "You're all set, let's set up your training.",
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {currentStep === 'basics' && (
          <BasicInfoStep
            displayName={displayName} setDisplayName={setDisplayName}
            sex={sex} setSex={setSex}
            birthMonth={birthMonth} setBirthMonth={setBirthMonth}
            birthDay={birthDay} setBirthDay={setBirthDay}
            birthYear={birthYear} setBirthYear={setBirthYear}
          />
        )}

        {currentStep === 'body' && (
          <BodyMetricsStep
            unitPreference={unitPreference} setUnitPreference={setUnitPreference}
            heightFeet={heightFeet} setHeightFeet={setHeightFeet}
            heightInches={heightInches} setHeightInches={setHeightInches}
            weight={weight} setWeight={setWeight}
            bodyFatPercent={bodyFatPercent} setBodyFatPercent={setBodyFatPercent}
          />
        )}

        {currentStep === 'experience' && (
          <ExperienceStep experienceLevel={experienceLevel} setExperienceLevel={setExperienceLevel} />
        )}

        {currentStep === 'activity' && (
          <ActivityStep activityLevel={activityLevel} setActivityLevel={setActivityLevel} />
        )}

        {currentStep === 'schedule' && (
          <ScheduleStep daysPerWeek={daysPerWeek} setDaysPerWeek={setDaysPerWeek} />
        )}

        {/* NUTRITION_HIDDEN: goal, nutrition, review steps removed */}
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
          onPress={currentStep === 'schedule' ? handleSubmit : next}
          disabled={isSubmitting}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === 'schedule'
              ? (isSubmitting ? 'Setting up...' : 'Start Training')
              : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
