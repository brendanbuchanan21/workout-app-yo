import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';
import EquipmentIcon from '../EquipmentIcon';
import { CatalogExercise } from '../../types/training';

interface ExerciseSearchPanelProps {
  catalog: CatalogExercise[];
  exerciseSearch: string;
  setExerciseSearch: (text: string) => void;
  selectedMuscle: string | null;
  setSelectedMuscle: (muscle: string | null) => void;
  existingIds: string[];
  onAddExercise: (ex: CatalogExercise) => void;
  title?: string;
  addLabel?: string;
}

export default function ExerciseSearchPanel({
  catalog,
  exerciseSearch,
  setExerciseSearch,
  selectedMuscle,
  setSelectedMuscle,
  existingIds,
  onAddExercise,
  title = 'Add Exercise',
  addLabel,
}: ExerciseSearchPanelProps) {
  const searchTerm = exerciseSearch.trim().toLowerCase();
  const filtered = searchTerm
    ? catalog.filter((e) => e.name.toLowerCase().includes(searchTerm))
    : selectedMuscle
      ? catalog.filter((e) => e.primaryMuscle === selectedMuscle)
      : [];

  return (
    <View style={{ marginTop: SPACING.md }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TextInput
        style={styles.exerciseSearchInput}
        placeholder="Search exercises..."
        placeholderTextColor={COLORS.text_tertiary}
        value={exerciseSearch}
        onChangeText={(text) => {
          setExerciseSearch(text);
          if (text.trim()) setSelectedMuscle(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          {Object.keys(MUSCLE_LABELS).map((muscle) => (
            <TouchableOpacity
              key={muscle}
              style={[styles.muscleChip, selectedMuscle === muscle && styles.muscleChipSelected]}
              onPress={() => { setSelectedMuscle(selectedMuscle === muscle ? null : muscle); setExerciseSearch(''); }}
            >
              <Text style={[styles.muscleChipText, selectedMuscle === muscle && styles.muscleChipTextSelected]}>
                {MUSCLE_LABELS[muscle] || muscle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      {filtered.map((ex) => {
        const alreadyInSession = existingIds.includes(ex.id);
        return (
          <TouchableOpacity
            key={ex.id}
            style={[styles.catalogCard, alreadyInSession && styles.catalogCardAdded]}
            onPress={() => !alreadyInSession && onAddExercise(ex)}
            disabled={alreadyInSession}
          >
            <EquipmentIcon equipment={ex.equipment} size={20} color={alreadyInSession ? COLORS.text_tertiary : COLORS.text_secondary} />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={[styles.catalogName, alreadyInSession && { color: COLORS.text_tertiary }]}>{ex.name}</Text>
              <Text style={styles.catalogMeta}>{ex.equipment} · {ex.movementType}</Text>
            </View>
            {alreadyInSession ? (
              <Text style={{ color: COLORS.success, fontSize: 13, fontWeight: '600' }}>Added</Text>
            ) : addLabel ? (
              <Text style={{ color: COLORS.accent_light, fontSize: 13, fontWeight: '700' }}>{addLabel}</Text>
            ) : (
              <Text style={{ color: COLORS.accent_light, fontSize: 20, fontWeight: '700' }}>+</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text_primary,
    marginBottom: SPACING.md,
  },
  exerciseSearchInput: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    color: COLORS.text_primary,
    fontSize: 15,
    marginBottom: SPACING.md,
  },
  muscleChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.accent_subtle,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent_muted,
  },
  muscleChipSelected: {
    backgroundColor: COLORS.accent_primary,
    borderColor: COLORS.accent_primary,
  },
  muscleChipText: {
    color: COLORS.accent_light,
    fontSize: 13,
    fontWeight: '600',
  },
  muscleChipTextSelected: {
    color: COLORS.text_on_accent,
  },
  catalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.sm,
  },
  catalogCardAdded: {
    opacity: 0.5,
  },
  catalogName: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
  },
  catalogMeta: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
});
