import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function getDateTitle(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return `${formatDate(dateStr)} · ${date.toLocaleDateString('en-US', { weekday: 'short' })} PRs`;
}

function getImprovementCopy(event: PREvent): string {
  if (!event.previousBest) return 'First time recorded at this weight';
  const repDelta = event.reps - event.previousBest.reps;
  if (repDelta > 0) return `+${repDelta} rep${repDelta === 1 ? '' : 's'} from previous best`;
  return 'Matched previous rep record';
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
              <View style={styles.dateRow}>
                <Text style={styles.dateHeader}>{getDateTitle(event.date)}</Text>
                <View style={styles.dateLine} />
                <Ionicons name="calendar-outline" size={15} color={COLORS.text_tertiary} />
              </View>
            )}
            <View style={styles.card}>
              <Svg style={styles.cardGradient} width="100%" height="100%" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id={`prCardBg-${i}`} x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#29292E" stopOpacity="1" />
                    <Stop offset="0.22" stopColor="#232328" stopOpacity="1" />
                    <Stop offset="0.58" stopColor="#1B1B20" stopOpacity="1" />
                    <Stop offset="1" stopColor="#101012" stopOpacity="1" />
                  </LinearGradient>
                  <LinearGradient id={`prCardSheen-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.045" />
                    <Stop offset="0.34" stopColor="#FFFFFF" stopOpacity="0.015" />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill={`url(#prCardBg-${i})`} />
                <Rect x="0" y="0" width="100%" height="48%" fill={`url(#prCardSheen-${i})`} />
              </Svg>
              <View style={styles.mainRow}>
                <View style={styles.info}>
                  <View style={styles.titleRow}>
                    <Text style={styles.exerciseName}>{event.exerciseName}</Text>
                    <Ionicons name="chevron-down" size={16} color={COLORS.text_tertiary} />
                  </View>
                  <Text style={styles.prValue}>
                    {formatWeight(event.weightKg)} x {event.reps}
                  </Text>
                  <Text style={styles.prevBest}>{getImprovementCopy(event)}</Text>
                </View>
                <View style={styles.rightRail}>
                  <Text style={styles.muscleTag}>
                    {MUSCLE_LABELS[event.primaryMuscle] || event.primaryMuscle}
                  </Text>
                  <View style={styles.recordBadge}>
                    <Ionicons name="trophy" size={15} color={COLORS.gold_light} />
                    <Text style={styles.recordBadgeText}>
                      {event.previousBest ? 'Rep PR' : 'New PR'}
                    </Text>
                  </View>
                  <View style={styles.sparkline}>
                    {[0.18, 0.42, 0.32, 0.66, 0.48, 0.78, 0.72].map((height, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.sparkBar,
                          { height: 5 + height * 15, opacity: idx === 6 ? 1 : 0.58 },
                        ]}
                      />
                    ))}
                  </View>
                </View>
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  dateHeader: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  card: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#29292E',
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  exerciseName: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '800',
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
  prValue: {
    color: COLORS.accent_primary,
    fontSize: 18,
    fontWeight: '800',
  },
  prevBest: {
    color: COLORS.text_secondary,
    fontSize: 12,
    marginTop: 2,
  },
  rightRail: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
    minWidth: 112,
  },
  recordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.gold_subtle,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  recordBadgeText: {
    color: COLORS.text_primary,
    fontSize: 12,
    fontWeight: '800',
  },
  sparkline: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  sparkBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent_primary,
  },
});
