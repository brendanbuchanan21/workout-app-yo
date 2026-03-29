import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';

interface MuscleGroupPillsProps {
  muscles: string[];
  selected: string | null;
  onSelect: (muscle: string | null) => void;
}

export default function MuscleGroupPills({ muscles, selected, onSelect }: MuscleGroupPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      <TouchableOpacity
        style={[styles.pill, selected === null && styles.pillActive]}
        onPress={() => onSelect(null)}
      >
        <Text style={[styles.pillText, selected === null && styles.pillTextActive]}>Recent</Text>
      </TouchableOpacity>
      {muscles.map((muscle) => (
        <TouchableOpacity
          key={muscle}
          style={[styles.pill, selected === muscle && styles.pillActive]}
          onPress={() => onSelect(muscle)}
        >
          <Text style={[styles.pillText, selected === muscle && styles.pillTextActive]}>
            {MUSCLE_LABELS[muscle] || muscle}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: SPACING.lg,
  },
  container: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  pill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg_elevated,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  pillActive: {
    backgroundColor: COLORS.accent_primary,
    borderColor: COLORS.accent_primary,
  },
  pillText: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: COLORS.text_on_accent,
  },
});
