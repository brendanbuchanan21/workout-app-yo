import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';
import { formatTonnage } from '../../utils/workoutFormatters';

export interface PastWorkout {
  id: string;
  date: string;
  completedAt: string | null;
  weekNumber: number;
  dayLabel: string;
  muscleGroups: string[];
  exerciseCount: number;
  totalSets: number;
  totalTonnageKg: number;
}

interface PastWorkoutsListProps {
  workouts: PastWorkout[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function PastWorkoutsList({ workouts }: PastWorkoutsListProps) {
  if (workouts.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No completed workouts yet in this block</Text>
      </View>
    );
  }

  const unit = 'imperial';

  return (
    <View>
      {workouts.map((w) => (
        <View key={w.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{w.dayLabel}</Text>
              <Text style={styles.cardMeta}>
                Week {w.weekNumber} · {formatDate(w.date)}
              </Text>
            </View>
          </View>

          {w.muscleGroups.length > 0 && (
            <Text style={styles.muscles} numberOfLines={1}>
              {w.muscleGroups.map((m) => MUSCLE_LABELS[m] || m).join(', ')}
            </Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{w.exerciseCount}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{w.totalSets}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {formatTonnage(w.totalTonnageKg, unit)}
              </Text>
              <Text style={styles.statLabel}>Tonnage</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '700',
  },
  cardMeta: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    marginTop: 2,
  },
  muscles: {
    color: COLORS.text_secondary,
    fontSize: 12,
    marginBottom: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  emptyCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.text_tertiary,
    fontSize: 13,
  },
});
