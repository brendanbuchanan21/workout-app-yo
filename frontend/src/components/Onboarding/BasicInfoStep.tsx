import { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface BasicInfoStepProps {
  displayName: string;
  setDisplayName: (v: string) => void;
  sex: 'male' | 'female';
  setSex: (v: 'male' | 'female') => void;
  birthMonth: string;
  setBirthMonth: (v: string) => void;
  birthDay: string;
  setBirthDay: (v: string) => void;
  birthYear: string;
  setBirthYear: (v: string) => void;
}

export default function BasicInfoStep({
  displayName, setDisplayName,
  sex, setSex,
  birthMonth, setBirthMonth,
  birthDay, setBirthDay,
  birthYear, setBirthYear,
}: BasicInfoStepProps) {
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  return (
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
          onChangeText={(t) => {
            const v = t.replace(/[^0-9]/g, '').slice(0, 2);
            setBirthMonth(v);
            if (v.length === 2) setTimeout(() => dayRef.current?.focus(), 50);
          }}
          keyboardType="number-pad"
          maxLength={2}
        />
        <TextInput
          ref={dayRef}
          style={[styles.input, { flex: 1, textAlign: 'center' }]}
          placeholder="DD"
          placeholderTextColor={COLORS.text_tertiary}
          value={birthDay}
          onChangeText={(t) => {
            const v = t.replace(/[^0-9]/g, '').slice(0, 2);
            setBirthDay(v);
            if (v.length === 2) setTimeout(() => yearRef.current?.focus(), 50);
          }}
          keyboardType="number-pad"
          maxLength={2}
        />
        <TextInput
          ref={yearRef}
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
