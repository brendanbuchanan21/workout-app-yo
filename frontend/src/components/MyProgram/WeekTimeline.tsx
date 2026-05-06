import { View, Text, ScrollView, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface WeekTimelineProps {
  days: { dayLabel: string; completed: boolean }[];
}

export default function WeekTimeline({ days }: WeekTimelineProps) {
  const completedCount = days.filter((day) => day.completed).length;
  const totalCount = days.length;
  const nextUpIndex = days.findIndex((d) => !d.completed);

  return (
    <View>
      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.summaryValue}>{completedCount}/{totalCount}</Text>
          <Text style={styles.summaryLabel}>Sessions complete</Text>
        </View>
        <Text style={styles.remainingText}>
          {Math.max(totalCount - completedCount, 0)} left
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` },
          ]}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sessionList}
      >
        {days.map((day, i) => {
          const isCompleted = day.completed;
          const isNextUp = i === nextUpIndex;
          return (
            <View
              key={day.dayLabel}
              style={[
                styles.sessionPill,
                isCompleted && styles.sessionPillCompleted,
                isNextUp && styles.sessionPillNext,
              ]}
            >
              <Text
                style={[
                  styles.sessionName,
                  isCompleted && styles.sessionNameCompleted,
                  isNextUp && styles.sessionNameNext,
                ]}
                numberOfLines={1}
              >
                {day.dayLabel}
              </Text>
              <Text
                style={[
                  styles.sessionStatus,
                  isCompleted && styles.sessionStatusCompleted,
                  isNextUp && styles.sessionStatusNext,
                ]}
              >
                {isCompleted ? 'Done' : isNextUp ? 'Next' : 'Open'}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  summaryValue: {
    color: COLORS.text_primary,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  summaryLabel: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  remainingText: {
    color: COLORS.text_secondary,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg_input,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg_input,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent_muted,
  },
  sessionList: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingBottom: 2,
  },
  sessionPill: {
    minWidth: 86,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg_input,
  },
  sessionPillCompleted: {
    borderColor: COLORS.accent_muted,
    backgroundColor: COLORS.accent_subtle,
  },
  sessionPillNext: {
    borderColor: COLORS.accent_primary,
  },
  sessionName: {
    color: COLORS.text_secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  sessionNameCompleted: {
    color: COLORS.text_primary,
  },
  sessionNameNext: {
    color: COLORS.accent_light,
  },
  sessionStatus: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sessionStatusCompleted: {
    color: COLORS.accent_light,
  },
  sessionStatusNext: {
    color: COLORS.accent_light,
  },
});
