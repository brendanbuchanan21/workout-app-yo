import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ScaleDecorator } from 'react-native-draggable-flatlist';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';
import { PendingExercise } from '../../types/training';

interface PendingExerciseCardProps {
  exercise: PendingExercise;
  index: number;
  totalCount: number;
  drag: () => void;
  isActive: boolean;
  isNovice?: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onUpdateSets: (index: number, sets: number) => void;
  onUpdateRepRange: (index: number, low: number, high: number) => void;
  onRemove: (index: number) => void;
}

export default function PendingExerciseCard({
  exercise: ex,
  index: i,
  totalCount,
  drag,
  isActive,
  isNovice,
  onMove,
  onUpdateSets,
  onUpdateRepRange,
  onRemove,
}: PendingExerciseCardProps) {
  return (
    <ScaleDecorator>
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        activeOpacity={0.7}
        style={[styles.pendingCard, isActive && { opacity: 0.9, borderColor: COLORS.accent_primary }]}
      >
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            onPress={() => onMove(i, -1)}
            style={styles.reorderBtn}
            disabled={i === 0}
          >
            <Text style={[styles.reorderBtnText, i === 0 && { opacity: 0.25 }]}>▲</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onMove(i, 1)}
            style={styles.reorderBtn}
            disabled={i === totalCount - 1}
          >
            <Text style={[styles.reorderBtnText, i === totalCount - 1 && { opacity: 0.25 }]}>▼</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pendingName}>{ex.exerciseName}</Text>
          <Text style={styles.pendingMeta}>
            {MUSCLE_LABELS[ex.muscleGroup] || ex.muscleGroup}
            {ex.prescription ? ' · Prescribed' : ''}
          </Text>
          {ex.adjustmentNote && (
            <Text style={styles.adjustmentNote}>{ex.adjustmentNote}</Text>
          )}
        </View>
        <View style={styles.controlsRow}>
          {!ex.prescription && (
            <View style={styles.repRangeControl}>
              <Text style={styles.controlLabel}>Reps</Text>
              <View style={styles.rangeRow}>
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => onUpdateRepRange(i, ex.repRangeLow - 1, ex.repRangeHigh)}
                >
                  <Text style={styles.setsBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.rangeValue}>{ex.repRangeLow}-{ex.repRangeHigh}</Text>
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => onUpdateRepRange(i, ex.repRangeLow, ex.repRangeHigh + 1)}
                >
                  <Text style={styles.setsBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              {isNovice && (
                <Text style={styles.recommendedLabel}>Recommended</Text>
              )}
            </View>
          )}
          <View style={styles.setsControl}>
            <Text style={styles.controlLabel}>Sets</Text>
            <View style={styles.rangeRow}>
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() => onUpdateSets(i, ex.sets - 1)}
              >
                <Text style={styles.setsBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.setsValue}>{ex.sets}</Text>
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() => onUpdateSets(i, ex.sets + 1)}
              >
                <Text style={styles.setsBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => onRemove(i)} style={{ paddingLeft: SPACING.md }}>
          <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '700' }}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </ScaleDecorator>
  );
}

const styles = StyleSheet.create({
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.sm,
  },
  reorderButtons: {
    marginRight: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  reorderBtn: {
    padding: 2,
  },
  reorderBtnText: {
    color: COLORS.text_tertiary,
    fontSize: 10,
  },
  pendingName: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
  },
  pendingMeta: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    marginTop: 2,
  },
  adjustmentNote: {
    color: COLORS.warning,
    fontSize: 11,
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  repRangeControl: {
    alignItems: 'center',
  },
  controlLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rangeValue: {
    color: COLORS.accent_light,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
  },
  recommendedLabel: {
    color: COLORS.text_tertiary,
    fontSize: 9,
    marginTop: 2,
    fontStyle: 'italic',
  },
  setsControl: {
    alignItems: 'center',
  },
  smallBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.bg_input,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  setsBtnText: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '700',
  },
  setsValue: {
    color: COLORS.accent_light,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
});
