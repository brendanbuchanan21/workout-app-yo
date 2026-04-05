import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface VolumeData {
  sets: number;
  tonnageKg: number;
}

interface ExerciseComparison {
  exerciseName: string;
  catalogId: string | null;
  muscleGroup: string;
  current: VolumeData | null;
  previous: VolumeData | null;
}

interface MuscleGroupComparison {
  muscle: string;
  current: VolumeData | null;
  previous: VolumeData | null;
}

interface ExerciseVolumeComparisonProps {
  exercises: ExerciseComparison[];
  muscleGroups: MuscleGroupComparison[];
  currentWeek: number;
}

function formatTonnage(kg: number): string {
  const lbs = Math.round(kg * 2.20462);
  return lbs >= 1000 ? `${(lbs / 1000).toFixed(1)}k` : `${lbs}`;
}

function formatMuscle(muscle: string): string {
  return muscle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function DeltaBadge({ current, previous, field }: {
  current: number;
  previous: number;
  field: 'sets' | 'tonnage';
}) {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <Text style={styles.deltaFlat}>{field === 'sets' ? '=' : '0%'}</Text>;
  const isUp = pct > 0;
  return (
    <Text style={[styles.delta, isUp ? styles.deltaUp : styles.deltaDown]}>
      {isUp ? '+' : ''}{pct}%
    </Text>
  );
}

function VolumeRow({ label, current, previous, isExercise }: {
  label: string;
  current: VolumeData | null;
  previous: VolumeData | null;
  isExercise?: boolean;
}) {
  const curr = current || { sets: 0, tonnageKg: 0 };
  const prev = previous;

  return (
    <View style={[styles.volumeRow, isExercise && styles.exerciseRow]}>
      <Text style={[styles.rowLabel, isExercise && styles.exerciseLabel]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.rowStats}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{curr.sets}</Text>
          {prev && <DeltaBadge current={curr.sets} previous={prev.sets} field="sets" />}
          {!prev && curr.sets > 0 && <Text style={styles.newBadge}>New</Text>}
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{formatTonnage(curr.tonnageKg)}</Text>
          {prev && <DeltaBadge current={curr.tonnageKg} previous={prev.tonnageKg} field="tonnage" />}
        </View>
      </View>
    </View>
  );
}

export default function ExerciseVolumeComparison({
  exercises,
  muscleGroups,
  currentWeek,
}: ExerciseVolumeComparisonProps) {
  const [expandedMuscle, setExpandedMuscle] = useState<string | null>(null);

  if (muscleGroups.length === 0) return null;

  const previousWeek = currentWeek - 1;

  return (
    <View>
      {/* Header with column labels */}
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel} />
        <View style={styles.rowStats}>
          <Text style={styles.headerStat}>Sets</Text>
          <Text style={styles.headerStat}>Volume</Text>
        </View>
      </View>

      {muscleGroups.map((mg) => {
        const isExpanded = expandedMuscle === mg.muscle;
        const muscleExercises = exercises.filter((e) => e.muscleGroup === mg.muscle);

        return (
          <View key={mg.muscle}>
            <TouchableOpacity
              style={styles.muscleCard}
              onPress={() => setExpandedMuscle(isExpanded ? null : mg.muscle)}
              activeOpacity={0.7}
            >
              <VolumeRow
                label={formatMuscle(mg.muscle)}
                current={mg.current}
                previous={mg.previous}
              />
              <Text style={styles.expandIcon}>{isExpanded ? '▾' : '▸'}</Text>
            </TouchableOpacity>

            {isExpanded && muscleExercises.length > 0 && (
              <View style={styles.exerciseList}>
                {muscleExercises.map((ex) => (
                  <VolumeRow
                    key={ex.catalogId || ex.exerciseName}
                    label={ex.exerciseName}
                    current={ex.current}
                    previous={ex.previous}
                    isExercise
                  />
                ))}
                {previousWeek >= 1 && (
                  <Text style={styles.comparisonNote}>
                    Compared to week {previousWeek}
                  </Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  headerLabel: {
    flex: 1,
  },
  headerStat: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: 64,
    textAlign: 'center',
  },
  muscleCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIcon: {
    color: COLORS.text_tertiary,
    fontSize: 14,
    marginLeft: SPACING.sm,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border_subtle,
  },
  rowLabel: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  exerciseLabel: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '400',
  },
  rowStats: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statCell: {
    width: 64,
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
  },
  delta: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  deltaUp: {
    color: COLORS.success,
  },
  deltaDown: {
    color: COLORS.danger,
  },
  deltaFlat: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    marginTop: 2,
  },
  newBadge: {
    color: COLORS.accent_primary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  exerciseList: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    marginTop: -SPACING.xs,
  },
  comparisonNote: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
});
