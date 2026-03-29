import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';
import { PREvent } from '../../types/training';

interface PRFeedViewProps {
  events: PREvent[];
}

function formatWeight(kg: number): string {
  return `${Math.round(kg * 2.20462)} lbs`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PRFeedView({ events }: PRFeedViewProps) {
  if (events.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No PRs Yet</Text>
        <Text style={styles.emptyText}>
          Complete workouts to start tracking your personal records.
        </Text>
      </View>
    );
  }

  let lastDate = '';

  return (
    <View>
      {events.map((event, i) => {
        const showDate = event.date !== lastDate;
        lastDate = event.date;

        return (
          <View key={i}>
            {showDate && (
              <Text style={styles.dateHeader}>{formatDate(event.date)}</Text>
            )}
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.exerciseName}>{event.exerciseName}</Text>
                <Text style={styles.muscleTag}>
                  {MUSCLE_LABELS[event.primaryMuscle] || event.primaryMuscle}
                </Text>
              </View>
              <View style={styles.prRow}>
                <Text style={styles.prValue}>
                  {formatWeight(event.weightKg)} x {event.reps}
                </Text>
                {event.previousBest ? (
                  <Text style={styles.prevBest}>
                    prev best: {event.previousBest.reps} reps
                  </Text>
                ) : (
                  <Text style={styles.firstTime}>first time at this weight</Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyTitle: {
    color: COLORS.text_primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  dateHeader: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  exerciseName: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  muscleTag: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: COLORS.bg_input,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  prValue: {
    color: COLORS.accent_primary,
    fontSize: 18,
    fontWeight: '700',
  },
  prevBest: {
    color: COLORS.text_tertiary,
    fontSize: 12,
  },
  firstTime: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
