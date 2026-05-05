import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { formatWeight, formatTonnage } from '../../utils/format';
import { CardGradientSurface } from '../shared/CardGradientSurface';
import { TimeRange } from './TimeRangePicker';

interface PeriodComparisonProps {
  range: TimeRange;
  startAvgE1rmKg: number;
  endAvgE1rmKg: number;
  changePercent: number;
  startAvgTonnageKg: number;
  endAvgTonnageKg: number;
  startAvgBestWeight: number;
  startAvgBestReps: number;
  endAvgBestWeight: number;
  endAvgBestReps: number;
}

const RANGE_TITLES: Record<TimeRange, string> = {
  '1m': 'Last Month',
  '3m': 'Last 3 Months',
  '6m': 'Last 6 Months',
  '1y': 'Last Year',
  all: 'Since First Logged',
};

export default function PeriodComparison(props: PeriodComparisonProps) {
  const isPositive = props.changePercent >= 0;

  return (
    <CardGradientSurface gradientId="exDetailPeriodE1rm" style={styles.container}>
      <Text style={styles.title}>{RANGE_TITLES[props.range]}</Text>

      <View style={styles.headerRow}>
        <View style={styles.metricColumn} />
        <Text style={styles.columnLabel}>At the Start</Text>
        <Text style={styles.columnLabel}>Now</Text>
      </View>

      <ComparisonRow
        label="Avg e1RM"
        startValue={formatWeight(props.startAvgE1rmKg)}
        endValue={formatWeight(props.endAvgE1rmKg)}
      />
      <ComparisonRow
        label="Avg Volume"
        startValue={formatTonnage(props.startAvgTonnageKg)}
        endValue={formatTonnage(props.endAvgTonnageKg)}
      />
      <ComparisonRow
        label="Best Set Avg"
        startValue={`${formatWeight(props.startAvgBestWeight)} x ${props.startAvgBestReps}`}
        endValue={`${formatWeight(props.endAvgBestWeight)} x ${props.endAvgBestReps}`}
      />

      <View style={[styles.changeRow, isPositive ? styles.changeRowUp : styles.changeRowDown]}>
        <Text style={[styles.changeText, { color: isPositive ? COLORS.success : COLORS.danger }]}>
          {isPositive ? '+' : ''}{props.changePercent.toFixed(1)}% e1RM {isPositive ? '↑' : '↓'}
        </Text>
      </View>
    </CardGradientSurface>
  );
}

function ComparisonRow({
  label,
  startValue,
  endValue,
}: {
  label: string;
  startValue: string;
  endValue: string;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={styles.statValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {startValue}
      </Text>
      <Text
        style={styles.statValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {endValue}
      </Text>
    </View>
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
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  columnLabel: {
    flex: 1,
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0,
    textAlign: 'right',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  metricColumn: {
    flex: 1,
  },
  statLabel: {
    flex: 1,
    color: COLORS.text_tertiary,
    fontSize: 13,
  },
  statValue: {
    flex: 1,
    color: COLORS.text_primary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
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
