import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { recalcCarbsFat } from '../../utils/macroCalculation';

interface MacroEstimate {
  tdee: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface ReviewStepProps {
  displayName: string;
  goal: 'cut' | 'bulk' | 'maintain';
  activityLevel: string;
  daysPerWeek: number;
  experienceLevel: string;
  proteinPerKg: number;
  dietStyle: 'balanced' | 'low_fat' | 'low_carb';
  unitPreference: 'imperial' | 'metric';
  weightKg: number;
  estimated: MacroEstimate | null;
  overrideCalories: string;
  setOverrideCalories: (v: string) => void;
  overrideProtein: string;
  setOverrideProtein: (v: string) => void;
  overrideCarbs: string;
  setOverrideCarbs: (v: string) => void;
  overrideFat: string;
  setOverrideFat: (v: string) => void;
}

export default function ReviewStep({
  displayName, goal, activityLevel, daysPerWeek, experienceLevel,
  proteinPerKg, dietStyle, unitPreference, weightKg, estimated,
  overrideCalories, setOverrideCalories,
  overrideProtein, setOverrideProtein,
  overrideCarbs, setOverrideCarbs,
  overrideFat, setOverrideFat,
}: ReviewStepProps) {
  const displayCals = overrideCalories || String(estimated?.calories ?? '—');
  const displayProteinVal = overrideProtein || String(estimated?.proteinG ?? '—');
  const displayCarbsVal = overrideCarbs || String(estimated?.carbsG ?? '—');
  const displayFatVal = overrideFat || String(estimated?.fatG ?? '—');

  const handleCaloriesChange = (t: string) => {
    const cal = t.replace(/[^0-9]/g, '');
    setOverrideCalories(cal);
    const calNum = parseInt(cal);
    if (calNum > 0 && estimated) {
      const protG = overrideProtein ? parseInt(overrideProtein) : estimated.proteinG;
      const remaining = calNum - protG * 4;
      if (remaining > 0) {
        const { carbsG, fatG } = recalcCarbsFat(calNum, protG, weightKg, dietStyle);
        setOverrideCarbs(String(carbsG));
        setOverrideFat(String(fatG));
      }
    }
  };

  const handleProteinChange = (t: string) => {
    const prot = t.replace(/[^0-9]/g, '');
    setOverrideProtein(prot);
    const protNum = parseInt(prot);
    if (protNum > 0 && estimated) {
      const calNum = overrideCalories ? parseInt(overrideCalories) : estimated.calories;
      const remaining = calNum - protNum * 4;
      if (remaining > 0) {
        const { carbsG, fatG } = recalcCarbsFat(calNum, protNum, weightKg, dietStyle);
        setOverrideCarbs(String(carbsG));
        setOverrideFat(String(fatG));
      }
    }
  };

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
            onChangeText={handleCaloriesChange}
            keyboardType="number-pad"
            selectTextOnFocus
          />
          <Text style={styles.macroUnit}>cal</Text>
        </View>
        <View style={styles.macroField}>
          <Text style={styles.macroLabel}>Protein</Text>
          <TextInput
            style={[styles.macroInput, overrideProtein ? styles.macroInputOverridden : null]}
            value={displayProteinVal}
            onChangeText={handleProteinChange}
            keyboardType="number-pad"
            selectTextOnFocus
          />
          <Text style={styles.macroUnit}>g</Text>
        </View>
        <View style={styles.macroField}>
          <Text style={styles.macroLabel}>Carbs</Text>
          <TextInput
            style={[styles.macroInput, overrideCarbs ? styles.macroInputOverridden : null]}
            value={displayCarbsVal}
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
            value={displayFatVal}
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
});
