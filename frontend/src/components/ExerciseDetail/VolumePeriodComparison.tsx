import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { formatTonnage } from '../../utils/format';
import { CardGradientSurface } from '../shared/CardGradientSurface';
import { TimeRange } from './TimeRangePicker';

interface Session {
  date: string;
  totalSets: number;
  totalTonnageKg: number;
}

interface VolumePeriodComparisonProps {
  range: TimeRange;
  sessions: Session[];
}

const RANGE_TITLES: Record<TimeRange, string> = {
  '1m': 'Last Month',
  '3m': 'Last 3 Months',
  '6m': 'Last 6 Months',
  '1y': 'Last Year',
  all: 'Since First Logged',
};

export default function VolumePeriodComparison({
  range,
  sessions,
}: VolumePeriodComparisonProps) {
  const midpoint = Math.max(1, Math.floor(sessions.length / 2));
  const startSessions = sessions.slice(0, midpoint);
  const endSessions = sessions.slice(midpoint);
  const startAvgWorkloadKg = startSessions.length > 0
    ? startSessions.reduce((sum, session) => sum + session.totalTonnageKg, 0) / startSessions.length
    : 0;
  const endAvgWorkloadKg = endSessions.length > 0
    ? endSessions.reduce((sum, session) => sum + session.totalTonnageKg, 0) / endSessions.length
    : startAvgWorkloadKg;
  const changePercent = startAvgWorkloadKg > 0
    ? ((endAvgWorkloadKg - startAvgWorkloadKg) / startAvgWorkloadKg) * 100
    : 0;
  const isPositive = changePercent >= 0;

  return (
    <CardGradientSurface gradientId="exDetailPeriodVol" style={styles.container}>
      <Text style={styles.title}>{RANGE_TITLES[range]}</Text>
      <Text style={styles.subtitle}>Average session workload</Text>

      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={styles.columnLabel}>At the Start</Text>
          <Text style={styles.value}>{formatTonnage(startAvgWorkloadKg)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.column}>
          <Text style={styles.columnLabel}>Now</Text>
          <Text style={styles.value}>{formatTonnage(endAvgWorkloadKg)}</Text>
        </View>
      </View>

      <View style={[styles.changeRow, isPositive ? styles.changeRowUp : styles.changeRowDown]}>
        <Text style={[styles.changeText, { color: isPositive ? COLORS.success : COLORS.danger }]}>
          {isPositive ? '+' : ''}{changePercent.toFixed(1)}% volume {isPositive ? 'up' : 'down'}
        </Text>
      </View>
    </CardGradientSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
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
  columns: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border_subtle,
    marginHorizontal: SPACING.md,
  },
  columnLabel: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: SPACING.sm,
  },
  value: {
    color: COLORS.text_primary,
    fontSize: 18,
    fontWeight: '700',
  },
  changeRow: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginHorizontal: -SPACING.lg,
    marginBottom: -SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  changeRowUp: {
    backgroundColor: COLORS.success_subtle,
  },
  changeRowDown: {
    backgroundColor: COLORS.danger_subtle,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
