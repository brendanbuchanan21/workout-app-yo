import { View, Text, ScrollView, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface WeekTimelineProps {
  days: { dayLabel: string; completed: boolean }[];
}

export default function WeekTimeline({ days }: WeekTimelineProps) {
  // Find the first incomplete day index (the "next up" day)
  const nextUpIndex = days.findIndex((d) => !d.completed);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((day, i) => {
        const isCompleted = day.completed;
        const isNextUp = i === nextUpIndex;
        const prevCompleted = i > 0 && days[i - 1].completed;

        return (
          <View key={day.dayLabel} style={styles.nodeWrapper}>
            {/* Connecting line */}
            {i > 0 && (
              <View
                style={[
                  styles.line,
                  isCompleted && prevCompleted && styles.lineCompleted,
                ]}
              />
            )}

            {/* Circle */}
            <View
              style={[
                styles.circle,
                isCompleted && styles.circleCompleted,
                isNextUp && styles.circleNextUp,
              ]}
            >
              {isCompleted && <Text style={styles.checkmark}>{'✓'}</Text>}
            </View>

            {/* Label */}
            <Text
              style={[styles.label, isCompleted && styles.labelCompleted]}
              numberOfLines={1}
            >
              {day.dayLabel}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const NODE_SIZE = 28;
const LINE_WIDTH = 24;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  nodeWrapper: {
    alignItems: 'center',
    width: NODE_SIZE + LINE_WIDTH,
    position: 'relative',
  },
  line: {
    position: 'absolute',
    top: NODE_SIZE / 2 - 1,
    right: '50%',
    width: LINE_WIDTH + NODE_SIZE / 2,
    height: 2,
    backgroundColor: COLORS.border_subtle,
    zIndex: -1,
  },
  lineCompleted: {
    backgroundColor: COLORS.success,
  },
  circle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg_primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  circleNextUp: {
    borderColor: COLORS.accent_primary,
  },
  checkmark: {
    color: COLORS.bg_primary,
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    marginTop: SPACING.xs,
    maxWidth: NODE_SIZE + LINE_WIDTH,
    textAlign: 'center',
  },
  labelCompleted: {
    color: COLORS.text_secondary,
  },
});
