import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface GoalStepProps {
  goal: 'cut' | 'bulk' | 'maintain';
  setGoal: (v: 'cut' | 'bulk' | 'maintain') => void;
  setProteinPerKg: (v: number) => void;
  targetWeight: string;
  setTargetWeight: (v: string) => void;
  targetRate: number;
  setTargetRate: (v: number) => void;
  unitPreference: 'imperial' | 'metric';
  weight: string;
}

export function GoalStep({
  goal, setGoal, setProteinPerKg,
  targetWeight, setTargetWeight,
  targetRate, setTargetRate,
  unitPreference, weight,
}: GoalStepProps) {
  return (
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
  );
}

interface NutritionStepProps {
  goal: 'cut' | 'bulk' | 'maintain';
  proteinPerKg: number;
  setProteinPerKg: (v: number) => void;
  dietStyle: 'balanced' | 'low_fat' | 'low_carb';
  setDietStyle: (v: 'balanced' | 'low_fat' | 'low_carb') => void;
  weight: string;
  unitPreference: 'imperial' | 'metric';
}

export function NutritionStep({
  goal, proteinPerKg, setProteinPerKg,
  dietStyle, setDietStyle,
  weight, unitPreference,
}: NutritionStepProps) {
  return (
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
  input: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    fontSize: 16,
    color: COLORS.text_primary,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
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
