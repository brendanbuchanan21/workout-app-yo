import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { PREvent } from '../../types/training';

interface RecentPRsProps {
  events: PREvent[];
}

function formatWeight(kg: number): string {
  return `${Math.round(kg * 2.20462)} lbs`;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  // Future dates fall through to the absolute month/day format instead of producing "-245d ago".
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 0 && diffDays < 7) return `${diffDays}d ago`;
  if (diffDays > 0 && diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RecentPRs({ events }: RecentPRsProps) {
  const router = useRouter();

  if (events.length === 0) return null;

  const top = events.slice(0, 3);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>RECENT PRS</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/progress')}>
          <Text style={styles.seeAll}>See all ›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        {top.map((event, i) => (
          <View
            key={i}
            style={[styles.row, i < top.length - 1 && styles.rowBorder]}
          >
            <View style={styles.trophyWrap}>
              <Text style={styles.trophy}>🏆</Text>
            </View>
            <View style={styles.rowLeft}>
              <Text style={styles.exerciseName} numberOfLines={1}>
                {event.exerciseName}
              </Text>
              {event.previousBest ? (
                <Text style={styles.meta}>
                  prev: {event.previousBest.reps} reps
                </Text>
              ) : null}
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.prValue}>
                {formatWeight(event.weightKg)} × {event.reps}
              </Text>
              <Text style={styles.date}>{formatRelativeDate(event.date)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.xl,
    marginTop: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerLabel: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  seeAll: {
    color: COLORS.accent_light,
    fontSize: 12,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border_subtle,
  },
  rowLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  exerciseName: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  meta: {
    color: COLORS.gold_primary,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  prValue: {
    color: COLORS.gold_primary,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  date: {
    color: COLORS.text_tertiary,
    fontSize: 11,
  },
  trophyWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gold_subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  trophy: {
    fontSize: 18,
  },
});
