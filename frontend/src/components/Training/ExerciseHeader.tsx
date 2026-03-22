import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

import { COLORS, SPACING } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';

interface ExerciseHeaderProps {
  exercise: any;
  exerciseCount: number;
  completedSets: number;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string) => void;
  onRemoveExercise: (exerciseId: string) => void;
}

export default function ExerciseHeader({
  exercise,
  exerciseCount,
  completedSets,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
}: ExerciseHeaderProps) {
  return (
    <View style={styles.exerciseHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.exerciseTitle}>{exercise.exerciseName}</Text>
        <Text style={styles.exerciseMeta}>
          {MUSCLE_LABELS[exercise.muscleGroup] || exercise.muscleGroup}
        </Text>
      </View>
      <View style={styles.setCountControl}>
        <TouchableOpacity
          onPress={() => onRemoveSet(exercise.id)}
          disabled={exercise.sets.length <= 1}
          style={styles.setCountBtn}
        >
          <Text style={[styles.setCountBtnText, exercise.sets.length <= 1 && { opacity: 0.25 }]}>-</Text>
        </TouchableOpacity>
        <View style={styles.setBadge}>
          <Text style={styles.setBadgeText}>{completedSets}/{exercise.sets.length} sets</Text>
        </View>
        <TouchableOpacity
          onPress={() => onAddSet(exercise.id)}
          disabled={exercise.sets.length >= 10}
          style={styles.setCountBtn}
        >
          <Text style={[styles.setCountBtnText, exercise.sets.length >= 10 && { opacity: 0.25 }]}>+</Text>
        </TouchableOpacity>
      </View>
      {exerciseCount > 1 && (
        <TouchableOpacity
          style={{ paddingLeft: SPACING.md }}
          onPress={() => {
            Alert.alert(
              'Remove Exercise?',
              `Remove ${exercise.exerciseName} from this workout?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => onRemoveExercise(exercise.id) },
              ],
            );
          }}
        >
          <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '700' }}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  exerciseTitle: {
    color: COLORS.text_primary,
    fontSize: 17,
    fontWeight: '600',
  },
  exerciseMeta: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    marginTop: 2,
  },
  setCountControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  setCountBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bg_input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setCountBtnText: {
    color: COLORS.text_secondary,
    fontSize: 16,
    fontWeight: '700',
  },
  setBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: COLORS.accent_subtle,
  },
  setBadgeText: {
    color: COLORS.accent_light,
    fontSize: 11,
    fontWeight: '600',
  },
});
