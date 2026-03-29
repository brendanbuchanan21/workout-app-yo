import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { formatWeight, formatTonnage } from '../../utils/format';

interface PeriodComparisonProps {
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

export default function PeriodComparison(props: PeriodComparisonProps) {
  const isPositive = props.changePercent >= 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Then vs Now</Text>

      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={styles.columnLabel}>Then</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>e1RM</Text>
            <Text style={styles.statValue}>{formatWeight(props.startAvgE1rmKg)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Load</Text>
            <Text style={styles.statValue}>{formatTonnage(props.startAvgTonnageKg)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Best</Text>
            <Text style={styles.statValue}>
              {formatWeight(props.startAvgBestWeight)} x {props.startAvgBestReps}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.column}>
          <Text style={styles.columnLabel}>Now</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>e1RM</Text>
            <Text style={styles.statValue}>{formatWeight(props.endAvgE1rmKg)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Load</Text>
            <Text style={styles.statValue}>{formatTonnage(props.endAvgTonnageKg)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Best</Text>
            <Text style={styles.statValue}>
              {formatWeight(props.endAvgBestWeight)} x {props.endAvgBestReps}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.changeRow}>
        <Text style={[styles.changeText, { color: isPositive ? COLORS.success : COLORS.danger }]}>
          {isPositive ? '+' : ''}{props.changePercent.toFixed(1)}% e1RM {isPositive ? '↑' : '↓'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
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
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    color: COLORS.text_tertiary,
    fontSize: 13,
  },
  statValue: {
    color: COLORS.text_primary,
    fontSize: 13,
    fontWeight: '600',
  },
  changeRow: {
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
