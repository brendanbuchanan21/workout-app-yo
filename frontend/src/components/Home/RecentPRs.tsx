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

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
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
            <View style={styles.rowLeft}>
              <Text style={styles.exerciseName} numberOfLines={1}>
                {event.exerciseName}
              </Text>
              <Text style={styles.meta}>
                {event.previousBest
                  ? `prev: ${event.previousBest.reps} reps`
                  : 'first time at weight'}
              </Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  seeAll: {
    color: COLORS.accent_light,
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    paddingHorizontal: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
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
    fontWeight: '600',
    marginBottom: 2,
  },
  meta: {
    color: COLORS.text_tertiary,
    fontSize: 11,
  },
  prValue: {
    color: COLORS.accent_primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  date: {
    color: COLORS.text_tertiary,
    fontSize: 11,
  },
});
