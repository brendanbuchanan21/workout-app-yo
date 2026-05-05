import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';
import { EnrichedPREntry } from '../../types/training';
import { CardGradientSurface } from '../shared/CardGradientSurface';

interface PRExerciseCardProps {
  pr: EnrichedPREntry;
  isExpanded: boolean;
  onToggle: () => void;
}

function formatWeight(kg: number): string {
  return `${Math.round(kg * 2.20462)} lbs`;
}

export default function PRExerciseCard({ pr, isExpanded, onToggle }: PRExerciseCardProps) {
  const topRecord = pr.records[0];
  const gradientKey = pr.catalogId || pr.exerciseName;

  return (
    <TouchableOpacity
      style={styles.rowWrap}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <CardGradientSurface gradientId={`progressPRExercise-${gradientKey}`} style={styles.card}>
        <View style={styles.header}>
          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text style={styles.name}>{pr.exerciseName}</Text>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.text_tertiary} />
            </View>
            <Text style={styles.meta}>
              {pr.records.length} weight{pr.records.length !== 1 ? 's' : ''} tracked
            </Text>
          </View>
          <Text style={styles.muscleTag}>{MUSCLE_LABELS[pr.primaryMuscle] || pr.primaryMuscle}</Text>
          {topRecord && (
            <View style={styles.best}>
              <Text style={styles.bestWeight}>{formatWeight(topRecord.weightKg)}</Text>
              <Text style={styles.bestReps}>x {topRecord.reps}</Text>
            </View>
          )}
        </View>

        {isExpanded && (
          <View style={styles.expanded}>
            {pr.records.map((rec, i) => (
              <View key={i} style={styles.recordRow}>
                <Text style={styles.recordWeight}>{formatWeight(rec.weightKg)}</Text>
                <Text style={styles.recordReps}>{rec.reps} reps</Text>
                <Text style={styles.recordDate}>
                  {new Date(rec.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </CardGradientSurface>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    marginBottom: SPACING.sm,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  name: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    marginTop: 2,
  },
  best: {
    alignItems: 'flex-end',
    marginLeft: SPACING.sm,
  },
  bestWeight: {
    color: COLORS.accent_primary,
    fontSize: 18,
    fontWeight: '700',
  },
  bestReps: {
    color: COLORS.text_secondary,
    fontSize: 13,
    marginTop: 1,
  },
  muscleTag: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: COLORS.success_subtle,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  expanded: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border_subtle,
  },
  recordWeight: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    width: 90,
  },
  recordReps: {
    color: COLORS.accent_primary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  recordDate: {
    color: COLORS.text_tertiary,
    fontSize: 12,
  },
});
