import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface SetInputs {
  weight: string;
  reps: string;
  rir: string;
}

interface SetRowProps {
  set: any;
  index: number;
  isEditing: boolean;
  exerciseIdx: number;
  kgToLbs: (kg: number) => number;
  onOpenSet: (exerciseIdx: number, setIdx: number) => void;
  onLogSet: (exerciseIdx: number, setIdx: number) => void;
  setInputs: SetInputs;
  setSetInputs: (fn: (prev: SetInputs) => SetInputs) => void;
}

export default function SetRow({
  set,
  index,
  isEditing,
  exerciseIdx,
  kgToLbs,
  onOpenSet,
  onLogSet,
  setInputs,
  setSetInputs,
}: SetRowProps) {
  return (
    <View>
      <TouchableOpacity
        style={[styles.setRow, set.completed && styles.setRowCompleted, isEditing && styles.setRowActive]}
        onPress={() => onOpenSet(exerciseIdx, index)}
      >
        <View style={[styles.setCircle, set.completed && styles.setCircleCompleted]}>
          {set.completed ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : (
            <Text style={styles.setNum}>{set.setNumber}</Text>
          )}
        </View>
        {set.completed ? (
          <View style={styles.setDetails}>
            <View style={styles.setDetail}>
              <Text style={styles.setDetailLabel}>WEIGHT</Text>
              <Text style={styles.setDetailValue}>{set.actualWeightKg != null ? `${kgToLbs(set.actualWeightKg)}` : '—'}</Text>
            </View>
            <View style={styles.setDetail}>
              <Text style={styles.setDetailLabel}>REPS</Text>
              <Text style={styles.setDetailValue}>{set.actualReps ?? '—'}</Text>
            </View>
            <View style={styles.setDetail}>
              <Text style={styles.setDetailLabel}>RIR</Text>
              <Text style={[styles.setDetailValue, { color: COLORS.accent_light }]}>{set.actualRir ?? '—'}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.setDetails}>
            <Text style={{ color: COLORS.text_tertiary, fontSize: 13 }}>Tap to log</Text>
          </View>
        )}
      </TouchableOpacity>
      {isEditing && (
        <View style={styles.setInputRow}>
          <View style={styles.setInputGroup}>
            <Text style={styles.setInputLabel}>Weight</Text>
            <TextInput
              style={styles.setInput}
              value={setInputs.weight}
              onChangeText={(t) => setSetInputs((prev) => ({ ...prev, weight: t }))}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={COLORS.text_tertiary}
              autoFocus
            />
          </View>
          <View style={styles.setInputGroup}>
            <Text style={styles.setInputLabel}>Reps</Text>
            <TextInput
              style={styles.setInput}
              value={setInputs.reps}
              onChangeText={(t) => setSetInputs((prev) => ({ ...prev, reps: t }))}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={COLORS.text_tertiary}
            />
          </View>
          <View style={styles.setInputGroup}>
            <Text style={styles.setInputLabel}>RIR</Text>
            <TextInput
              style={styles.setInput}
              value={setInputs.rir}
              onChangeText={(t) => setSetInputs((prev) => ({ ...prev, rir: t }))}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={COLORS.text_tertiary}
            />
          </View>
          <TouchableOpacity
            style={styles.setConfirmBtn}
            onPress={() => onLogSet(exerciseIdx, index)}
          >
            <Text style={styles.setConfirmBtnText}>✓</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  setRowCompleted: {
    backgroundColor: COLORS.accent_subtle,
    borderColor: 'rgba(232,145,45,0.2)',
  },
  setRowActive: {
    borderColor: COLORS.accent_primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  setInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    backgroundColor: COLORS.bg_secondary,
    padding: SPACING.md,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: COLORS.accent_primary,
    marginBottom: SPACING.sm,
  },
  setInputGroup: {
    flex: 1,
  },
  setInputLabel: {
    color: COLORS.text_tertiary,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  setInput: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  setConfirmBtn: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.sm,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setConfirmBtnText: {
    color: COLORS.text_on_accent,
    fontSize: 18,
    fontWeight: '700',
  },
  setCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.bg_input,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  setCircleCompleted: {
    backgroundColor: COLORS.accent_primary,
  },
  checkmark: {
    color: COLORS.text_on_accent,
    fontSize: 12,
    fontWeight: '700',
  },
  setNum: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '600',
  },
  setDetails: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  setDetail: {},
  setDetailLabel: {
    color: COLORS.text_tertiary,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setDetailValue: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
