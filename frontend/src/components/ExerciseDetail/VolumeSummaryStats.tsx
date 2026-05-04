import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { formatTonnage } from '../../utils/format';

interface Session {
  date: string;
  totalTonnageKg: number;
  totalSets: number;
}

interface VolumeSummaryStatsProps {
  sessions: Session[];
}

function formatDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: '2-digit' }),
  });
}

export default function VolumeSummaryStats({ sessions }: VolumeSummaryStatsProps) {
  const latest = sessions[sessions.length - 1];
  const previous = sessions.length >= 2 ? sessions[sessions.length - 2] : null;
  const peak = sessions.reduce(
    (best, session) => session.totalTonnageKg > best.totalTonnageKg ? session : best,
    sessions[0],
  );
  const delta = previous ? latest.totalTonnageKg - previous.totalTonnageKg : null;

  return (
    <View style={styles.row}>
      <View style={styles.box}>
        <Text style={styles.label}>Current Volume</Text>
        <Text style={styles.value}>{formatTonnage(latest.totalTonnageKg)}</Text>
        {delta !== null && delta !== 0 ? (
          <Text style={[styles.delta, { color: delta > 0 ? COLORS.success : COLORS.danger }]}>
            {delta > 0 ? '+' : '-'}{formatTonnage(Math.abs(delta))}
          </Text>
        ) : null}
      </View>
      <View style={[styles.box, styles.boxMiddle]}>
        <Text style={styles.label}>Peak Volume</Text>
        <Text style={styles.value}>{formatTonnage(peak.totalTonnageKg)}</Text>
        <Text style={styles.subLabel}>{formatDate(peak.date)}</Text>
      </View>
      <View style={styles.box}>
        <Text style={styles.label}>Sets</Text>
        <Text style={styles.value}>{latest.totalSets}</Text>
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
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  delta: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  subLabel: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    marginTop: 2,
  },
});
