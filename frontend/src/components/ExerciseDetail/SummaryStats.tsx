import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { formatWeight } from '../../utils/format';

interface SummaryStatsProps {
  currentE1rmKg: number;
  peakE1rmKg: number;
  peakE1rmDate: string;
  totalSessions: number;
  previousE1rmKg: number | null;
}

export default function SummaryStats({
  currentE1rmKg, peakE1rmKg, peakE1rmDate, totalSessions, previousE1rmKg,
}: SummaryStatsProps) {
  const delta = previousE1rmKg !== null ? currentE1rmKg - previousE1rmKg : null;
  const peakDateLabel = peakE1rmDate
    ? (() => {
        const d = new Date(peakE1rmDate + 'T12:00:00');
        const sameYear = d.getFullYear() === new Date().getFullYear();
        return d.toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', ...(sameYear ? {} : { year: '2-digit' }),
        });
      })()
    : '';

  return (
    <View style={styles.row}>
      <View style={styles.box}>
        <Text style={styles.label}>Current e1RM</Text>
        <Text style={styles.value}>{formatWeight(currentE1rmKg)}</Text>
        {delta !== null && delta !== 0 && (
          <Text style={[styles.delta, { color: delta > 0 ? COLORS.success : COLORS.danger }]}>
            {delta > 0 ? '+' : ''}{formatWeight(Math.abs(delta))}
          </Text>
        )}
      </View>
      <View style={[styles.box, styles.boxMiddle]}>
        <Text style={styles.label}>Peak e1RM</Text>
        <Text style={styles.value}>{formatWeight(peakE1rmKg)}</Text>
        <Text style={styles.subLabel}>{peakDateLabel}</Text>
      </View>
      <View style={styles.box}>
        <Text style={styles.label}>Sessions</Text>
        <Text style={styles.value}>{totalSessions}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  box: {
    flex: 1,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.md,
    alignItems: 'center',
  },
  boxMiddle: {
    marginHorizontal: SPACING.sm,
  },
  label: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: SPACING.xs,
  },
  value: {
    color: COLORS.accent_primary,
    fontSize: 18,
    fontWeight: '700',
  },
  delta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  subLabel: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    marginTop: 2,
  },
});
