import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface BodyMetricsStepProps {
  unitPreference: 'imperial' | 'metric';
  setUnitPreference: (v: 'imperial' | 'metric') => void;
  heightFeet: string;
  setHeightFeet: (v: string) => void;
  heightInches: string;
  setHeightInches: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  bodyFatPercent: string;
  setBodyFatPercent: (v: string) => void;
}

export default function BodyMetricsStep({
  unitPreference, setUnitPreference,
  heightFeet, setHeightFeet,
  heightInches, setHeightInches,
  weight, setWeight,
  bodyFatPercent, setBodyFatPercent,
}: BodyMetricsStepProps) {
  return (
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
      {/*
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
      */}
    </View>
  );
}

function OptionButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.optionButton, selected && styles.optionButtonSelected]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
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
});
