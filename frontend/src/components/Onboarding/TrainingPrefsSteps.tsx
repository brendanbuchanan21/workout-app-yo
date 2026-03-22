import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface ExperienceStepProps {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  setExperienceLevel: (v: 'beginner' | 'intermediate' | 'advanced') => void;
}

export function ExperienceStep({ experienceLevel, setExperienceLevel }: ExperienceStepProps) {
  return (
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
  );
}

interface ActivityStepProps {
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  setActivityLevel: (v: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active') => void;
}

export function ActivityStep({ activityLevel, setActivityLevel }: ActivityStepProps) {
  return (
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
  );
}

interface ScheduleStepProps {
  daysPerWeek: number;
  setDaysPerWeek: (v: number) => void;
}

export function ScheduleStep({ daysPerWeek, setDaysPerWeek }: ScheduleStepProps) {
  return (
    <View>
      <Text style={styles.stepTitle}>How many days per week can you train?</Text>
      <Text style={styles.stepSubtitle}>This affects your calorie calculation and training split options</Text>
      <View style={styles.optionRow}>
        {[3, 4, 5, 6].map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.optionButton, daysPerWeek === d && styles.optionButtonSelected]}
            onPress={() => setDaysPerWeek(d)}
          >
            <Text style={[styles.optionText, daysPerWeek === d && styles.optionTextSelected]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
