import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { ALL_MUSCLE_GROUPS, MUSCLE_LABELS } from '../../constants/training';

interface CustomDay {
  dayLabel: string;
  muscleGroups: string[];
}

interface SplitBuilderProps {
  customDays: CustomDay[];
  editingDayIndex: number | null;
  setEditingDayIndex: (idx: number | null) => void;
  setCustomDays: (days: CustomDay[]) => void;
}

const SplitBuilder = ({ customDays, editingDayIndex, setEditingDayIndex, setCustomDays }: SplitBuilderProps) => (
  <View style={{ marginTop: SPACING.lg }}>
    <Text style={styles.sectionTitle}>Your Days</Text>
    {customDays.map((day, dayIdx) => (
      <View key={dayIdx} style={[styles.dayCard, editingDayIndex === dayIdx && styles.dayCardActive, { marginBottom: SPACING.md }]}>
        <TouchableOpacity
          onPress={() => setEditingDayIndex(editingDayIndex === dayIdx ? null : dayIdx)}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.dayTitle, editingDayIndex === dayIdx && styles.dayTitleActive]}>
              {day.dayLabel}
            </Text>
            <Text style={{ color: COLORS.text_tertiary, fontSize: 11 }}>
              {day.muscleGroups.length > 0
                ? day.muscleGroups.map((m) => MUSCLE_LABELS[m] || m).join(', ')
                : 'Tap to set up'}
            </Text>
          </View>
        </TouchableOpacity>

        {editingDayIndex === dayIdx && (
          <View style={{ marginTop: SPACING.md }}>
            <TextInput
              style={[styles.input, { marginBottom: SPACING.md }]}
              placeholder="Day name (e.g., Chest & Triceps)"
              placeholderTextColor={COLORS.text_tertiary}
              value={day.dayLabel}
              onChangeText={(text) => {
                const updated = [...customDays];
                updated[dayIdx] = { ...updated[dayIdx], dayLabel: text };
                setCustomDays(updated);
              }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {ALL_MUSCLE_GROUPS.map((muscle) => {
                const isSelected = day.muscleGroups.includes(muscle);
                return (
                  <TouchableOpacity
                    key={muscle}
                    style={[styles.muscleChip, isSelected && styles.muscleChipSelected, { marginBottom: 4 }]}
                    onPress={() => {
                      const updated = [...customDays];
                      const muscles = isSelected
                        ? day.muscleGroups.filter((m) => m !== muscle)
                        : [...day.muscleGroups, muscle];
                      updated[dayIdx] = { ...updated[dayIdx], muscleGroups: muscles };
                      setCustomDays(updated);
                    }}
                  >
                    <Text style={[styles.muscleChipText, isSelected && styles.muscleChipTextSelected]}>
                      {MUSCLE_LABELS[muscle]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    ))}
  </View>
);

export default SplitBuilder;

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text_primary,
    marginBottom: SPACING.md,
    marginTop: SPACING.xl,
  },
  dayCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  dayCardActive: {
    backgroundColor: COLORS.accent_subtle,
    borderColor: COLORS.accent_muted,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text_primary,
  },
  dayTitleActive: {
    color: COLORS.accent_light,
  },
  input: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    fontSize: 16,
    color: COLORS.text_primary,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  muscleChip: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  muscleChipSelected: {
    backgroundColor: COLORS.accent_subtle,
    borderColor: COLORS.accent_muted,
  },
  muscleChipText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  muscleChipTextSelected: {
    color: COLORS.accent_light,
  },
});
