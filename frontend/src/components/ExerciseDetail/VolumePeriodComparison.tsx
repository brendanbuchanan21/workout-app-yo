import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { formatTonnage } from '../../utils/format';

interface VolumePeriodComparisonProps {
  startAvgTonnageKg: number;
  endAvgTonnageKg: number;
}

export default function VolumePeriodComparison({
  startAvgTonnageKg,
  endAvgTonnageKg,
}: VolumePeriodComparisonProps) {
  const changePercent = startAvgTonnageKg > 0
    ? ((endAvgTonnageKg - startAvgTonnageKg) / startAvgTonnageKg) * 100
    : 0;
  const isPositive = changePercent >= 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Then vs Now</Text>
      <Text style={styles.subtitle}>Average session tonnage across this range</Text>

      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={styles.columnLabel}>Then</Text>
          <Text style={styles.value}>{formatTonnage(startAvgTonnageKg)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.column}>
          <Text style={styles.columnLabel}>Now</Text>
          <Text style={styles.value}>{formatTonnage(endAvgTonnageKg)}</Text>
        </View>
      </View>

      <View style={styles.changeRow}>
        <Text style={[styles.changeText, { color: isPositive ? COLORS.success : COLORS.danger }]}>
          {isPositive ? '+' : ''}{changePercent.toFixed(1)}% volume {isPositive ? 'up' : 'down'}
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
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
