import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all';

const DEFAULT_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'ALL' },
];

interface TimeRangePickerProps<T extends TimeRange = TimeRange> {
  selected: T;
  onSelect: (range: T) => void;
  options?: { value: T; label: string }[];
}

export default function TimeRangePicker<T extends TimeRange = TimeRange>({
  selected,
  onSelect,
  options,
}: TimeRangePickerProps<T>) {
  const items = options ?? (DEFAULT_OPTIONS as { value: T; label: string }[]);

  return (
    <View style={styles.container}>
      {items.map(({ value, label }) => (
        <TouchableOpacity
          key={value}
          style={[styles.pill, selected === value && styles.pillActive]}
          onPress={() => onSelect(value)}
        >
          <Text style={[styles.pillText, selected === value && styles.pillTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.lg,
  },
  pill: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: COLORS.bg_input,
  },
  pillText: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: COLORS.text_primary,
  },
});
