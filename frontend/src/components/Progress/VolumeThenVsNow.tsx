import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface VolumeWeek {
  weekStart: string;
  muscles: Record<string, number>;
}

interface VolumeThenVsNowProps {
  volumeWeeks: VolumeWeek[];
  rangeMonths: number;
}

function formatMuscle(muscle: string): string {
  return muscle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function computeAvgWeeklySets(weeks: VolumeWeek[]): Record<string, number> {
  if (weeks.length === 0) return {};
  const totals: Record<string, number> = {};
  for (const week of weeks) {
    for (const [muscle, sets] of Object.entries(week.muscles)) {
      totals[muscle] = (totals[muscle] || 0) + sets;
    }
  }
  const result: Record<string, number> = {};
  for (const [muscle, total] of Object.entries(totals)) {
    result[muscle] = total / weeks.length;
  }
  return result;
}

export default function VolumeThenVsNow({ volumeWeeks, rangeMonths }: VolumeThenVsNowProps) {
  if (volumeWeeks.length < 2) {
    return null;
  }

  // Split weeks into "then" (older half) and "now" (recent half) by midpoint
  const midpoint = Math.floor(volumeWeeks.length / 2);
  const thenWeeks = volumeWeeks.slice(0, midpoint);
  const nowWeeks = volumeWeeks.slice(midpoint);

  if (thenWeeks.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Then vs Now</Text>
        <Text style={styles.emptyText}>Train for longer to see comparisons</Text>
      </View>
    );
  }

  const thenAvg = computeAvgWeeklySets(thenWeeks);
  const nowAvg = computeAvgWeeklySets(nowWeeks);

  const allMuscles = Array.from(new Set([...Object.keys(thenAvg), ...Object.keys(nowAvg)]));

  const rows = allMuscles.map((muscle) => {
    const then = thenAvg[muscle] || 0;
    const now = nowAvg[muscle] || 0;
    const pctChange = then > 0 ? ((now - then) / then) * 100 : now > 0 ? 100 : 0;
    return { muscle, then, now, pctChange };
  });

  // Sort by absolute change (biggest movers first)
  rows.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));

  // Overall totals
  const overallThen = Object.values(thenAvg).reduce((a, b) => a + b, 0);
  const overallNow = Object.values(nowAvg).reduce((a, b) => a + b, 0);
  const overallPct = overallThen > 0
    ? ((overallNow - overallThen) / overallThen) * 100
    : overallNow > 0 ? 100 : 0;

  const rangeLabel = rangeMonths >= 12 ? `${rangeMonths / 12}Y` : `${rangeMonths}M`;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Then vs Now</Text>
      <Text style={styles.subtitle}>
        Avg weekly sets (last {rangeLabel} vs prior {rangeLabel})
      </Text>

      {rows.map(({ muscle, then, now, pctChange }) => (
        <View key={muscle} style={styles.row}>
          <Text style={styles.muscleLabel}>{formatMuscle(muscle)}</Text>
          <Text style={styles.values}>
            {then.toFixed(1)} → {now.toFixed(1)}
          </Text>
          <View style={[
            styles.badge,
            { backgroundColor: pctChange >= 0 ? COLORS.success + '20' : COLORS.danger + '20' },
          ]}>
            <Text style={[
              styles.badgeText,
              { color: pctChange >= 0 ? COLORS.success : COLORS.danger },
            ]}>
              {pctChange >= 0 ? '+' : ''}{Math.round(pctChange)}%{' '}
              {pctChange >= 0 ? '↑' : '↓'}
            </Text>
          </View>
        </View>
      ))}

      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={[styles.muscleLabel, styles.overallLabel]}>Overall</Text>
        <Text style={[styles.values, styles.overallValues]}>
          {overallThen.toFixed(1)} → {overallNow.toFixed(1)}
        </Text>
        <View style={[
          styles.badge,
          { backgroundColor: overallPct >= 0 ? COLORS.success + '20' : COLORS.danger + '20' },
        ]}>
          <Text style={[
            styles.badgeText,
            { color: overallPct >= 0 ? COLORS.success : COLORS.danger },
          ]}>
            {overallPct >= 0 ? '+' : ''}{Math.round(overallPct)}%{' '}
            {overallPct >= 0 ? '↑' : '↓'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
  },
  title: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    marginTop: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  muscleLabel: {
    color: COLORS.text_secondary,
    fontSize: 12,
    width: 80,
  },
  values: {
    color: COLORS.text_primary,
    fontSize: 12,
    flex: 1,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border_subtle,
    marginVertical: SPACING.sm,
  },
  overallLabel: {
    fontWeight: '600',
    color: COLORS.text_primary,
  },
  overallValues: {
    fontWeight: '600',
  },
});
