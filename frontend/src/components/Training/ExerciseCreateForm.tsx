import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';

interface NewExerciseState {
  name: string;
  primaryMuscle: string;
  equipment: string;
  movementType: 'compound' | 'isolation';
}

interface ExerciseCreateFormProps {
  newExercise: NewExerciseState;
  onChangeNewExercise: (updated: NewExerciseState) => void;
  onCreateCustomExercise: () => void;
}

export default function ExerciseCreateForm({
  newExercise,
  onChangeNewExercise,
  onCreateCustomExercise,
}: ExerciseCreateFormProps) {
  return (
    <View style={styles.createExerciseForm}>
      <TextInput
        style={styles.createExerciseInput}
        placeholder="Exercise name"
        placeholderTextColor={COLORS.text_tertiary}
        value={newExercise.name}
        onChangeText={(text) => onChangeNewExercise({ ...newExercise, name: text })}
        autoCapitalize="words"
      />

      <Text style={styles.createExerciseLabel}>Muscle Group</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          {Object.entries(MUSCLE_LABELS).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.muscleChip, newExercise.primaryMuscle === key && styles.muscleChipSelected]}
              onPress={() => onChangeNewExercise({ ...newExercise, primaryMuscle: key })}
            >
              <Text style={[styles.muscleChipText, newExercise.primaryMuscle === key && styles.muscleChipTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.createExerciseLabel}>Equipment</Text>
      <View style={styles.createExerciseOptions}>
        {['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'].map((eq) => (
          <TouchableOpacity
            key={eq}
            style={[styles.optionChip, newExercise.equipment === eq && styles.optionChipSelected]}
            onPress={() => onChangeNewExercise({ ...newExercise, equipment: eq })}
          >
            <Text style={[styles.optionChipText, newExercise.equipment === eq && styles.optionChipTextSelected]}>
              {eq.charAt(0).toUpperCase() + eq.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.createExerciseLabel}>Movement Type</Text>
      <View style={styles.createExerciseOptions}>
        {(['compound', 'isolation'] as const).map((mt) => (
          <TouchableOpacity
            key={mt}
            style={[styles.optionChip, newExercise.movementType === mt && styles.optionChipSelected]}
            onPress={() => onChangeNewExercise({ ...newExercise, movementType: mt })}
          >
            <Text style={[styles.optionChipText, newExercise.movementType === mt && styles.optionChipTextSelected]}>
              {mt.charAt(0).toUpperCase() + mt.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.createExerciseBtn} onPress={onCreateCustomExercise}>
        <Text style={styles.createExerciseBtnText}>Create & Add To Exercise</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  createExerciseForm: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
  },
  createExerciseInput: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    color: COLORS.text_primary,
    fontSize: 15,
    marginBottom: SPACING.md,
  },
  createExerciseLabel: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  createExerciseOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  muscleChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.accent_subtle,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent_muted,
  },
  muscleChipSelected: {
    backgroundColor: COLORS.accent_primary,
    borderColor: COLORS.accent_primary,
  },
  muscleChipText: {
    color: COLORS.accent_light,
    fontSize: 13,
    fontWeight: '600',
  },
  muscleChipTextSelected: {
    color: COLORS.text_on_accent,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  optionChipSelected: {
    borderColor: COLORS.accent_primary,
    backgroundColor: COLORS.accent_subtle,
  },
  optionChipText: {
    color: COLORS.text_tertiary,
    fontSize: 13,
  },
  optionChipTextSelected: {
    color: COLORS.accent_primary,
  },
  createExerciseBtn: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  createExerciseBtnText: {
    color: COLORS.text_on_accent,
    fontSize: 15,
    fontWeight: '700',
  },
});
