import { View, Text, StyleSheet } from 'react-native';

import { COLORS } from '../../constants/theme';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
}

export default function MacroBar({ label, current, target, color }: MacroBarProps) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <View style={styles.macroBarRow}>
      <View style={styles.macroBarLabelRow}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={styles.macroBarValues}>
          {Math.round(current)} <Text style={{ color: COLORS.text_tertiary }}>/ {target}</Text>
        </Text>
      </View>
      <View style={styles.macroBarBg}>
        <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  macroBarRow: {
    gap: 4,
  },
  macroBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroBarLabel: {
    color: COLORS.text_secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  macroBarValues: {
    color: COLORS.text_primary,
    fontSize: 12,
    fontWeight: '600',
  },
  macroBarBg: {
    height: 6,
    backgroundColor: COLORS.bg_input,
    borderRadius: 3,
  },
  macroBarFill: {
    height: 6,
    borderRadius: 3,
  },
});
