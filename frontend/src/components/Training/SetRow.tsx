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
  const targetParts = [
    set.targetReps != null ? `${set.targetReps} reps` : null,
    set.targetWeightKg != null ? `@ ${kgToLbs(set.targetWeightKg)} lb` : null,
    set.targetRir != null ? `RIR ${set.targetRir}` : null,
  ].filter(Boolean);

  return (
    <View>
      <TouchableOpacity
        style={[styles.setRow, set.completed && styles.setRowCompleted, isEditing && styles.setRowActive]}
        onPress={() => onOpenSet(exerciseIdx, index)}
      >
        <View style={[styles.setPill, set.completed && styles.setPillCompleted]}>
          <Text style={[styles.setPillText, set.completed && styles.setPillTextCompleted]}>
            {set.completed ? '✓' : set.setNumber}
          </Text>
        </View>

        <View style={styles.setContent}>
          <Text style={styles.setTitle}>Set {set.setNumber}</Text>
          {set.completed ? (
            <Text style={styles.setSubtitle}>
              {set.actualReps ?? '—'} reps
              {set.actualWeightKg != null ? ` @ ${kgToLbs(set.actualWeightKg)} lb` : ''}
              {set.actualRir != null ? ` · RIR ${set.actualRir}` : ''}
            </Text>
          ) : (
            <Text style={styles.setSubtitle}>
              {targetParts.length > 0 ? targetParts.join(' · ') : 'Tap to log'}
            </Text>
          )}
        </View>

        <Text style={[styles.setAction, set.completed && styles.setActionCompleted]}>
          {set.completed ? 'Logged' : 'Tap to log'}
        </Text>
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: COLORS.bg_card,
    borderRadius: 0,
    marginBottom: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  setRowCompleted: {
    backgroundColor: COLORS.accent_subtle,
    borderColor: 'rgba(232,145,45,0.22)',
  },
  setRowActive: {
    backgroundColor: COLORS.bg_input,
    borderColor: COLORS.border,
  },
  setPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.bg_input,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  setPillCompleted: {
    backgroundColor: COLORS.accent_primary,
  },
  setPillText: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  setPillTextCompleted: {
    color: COLORS.text_on_accent,
  },
  setContent: {
    flex: 1,
    gap: 2,
  },
  setTitle: {
    color: COLORS.text_primary,
    fontSize: 17,
    fontWeight: '800',
  },
  setSubtitle: {
    color: COLORS.text_secondary,
    fontSize: 14,
  },
  setAction: {
    color: COLORS.text_tertiary,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: SPACING.md,
  },
  setActionCompleted: {
    color: COLORS.accent_light,
    fontWeight: '600',
  },
  setInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    backgroundColor: COLORS.bg_secondary,
    padding: SPACING.md,
    borderBottomLeftRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: COLORS.border,
    marginBottom: 0,
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
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setConfirmBtnText: {
    color: COLORS.text_on_accent,
    fontSize: 18,
    fontWeight: '700',
  },
});
