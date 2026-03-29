import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';
import EquipmentIcon from '../EquipmentIcon';
import ExerciseCreateForm from './ExerciseCreateForm';
import PendingExerciseCard from './PendingExerciseCard';
import { CatalogExercise, PendingExercise, TodayContext } from '../../types/training';

interface BuildModeProps {
  today: TodayContext;
  catalog: CatalogExercise[];
  pendingExercises: PendingExercise[];
  selectedMuscle: string | null;
  exerciseSearch: string;
  showCreateExercise: boolean;
  newExercise: {
    name: string;
    primaryMuscle: string;
    equipment: string;
    movementType: 'compound' | 'isolation';
  };
  onSetSelectedMuscle: (muscle: string | null) => void;
  onSetExerciseSearch: (text: string) => void;
  onSetShowCreateExercise: (show: boolean) => void;
  onSetNewExercise: (ex: { name: string; primaryMuscle: string; equipment: string; movementType: 'compound' | 'isolation' }) => void;
  onAddExercise: (exercise: CatalogExercise) => void;
  onRemoveExercise: (index: number) => void;
  onMoveExercise: (index: number, direction: -1 | 1) => void;
  onUpdateSets: (index: number, sets: number) => void;
  onUpdateRepRange: (index: number, low: number, high: number) => void;
  onReorderExercises: (data: PendingExercise[]) => void;
  onStartWorkout: () => void;
  onCreateCustomExercise: () => void;
  onGoBackToDayPicker: () => void;
  showBackButton: boolean;
  isNovice?: boolean;
  SettingsLink: React.ComponentType;
}

export default function BuildMode({
  today,
  catalog,
  pendingExercises,
  selectedMuscle,
  exerciseSearch,
  showCreateExercise,
  newExercise,
  onSetSelectedMuscle,
  onSetExerciseSearch,
  onSetShowCreateExercise,
  onSetNewExercise,
  onAddExercise,
  onRemoveExercise,
  onMoveExercise,
  onUpdateSets,
  onUpdateRepRange,
  onReorderExercises,
  onStartWorkout,
  onCreateCustomExercise,
  onGoBackToDayPicker,
  showBackButton,
  isNovice,
  SettingsLink,
}: BuildModeProps) {
  const suggestedMuscles = today.suggestedMuscleGroups;
  const searchTerm = exerciseSearch.trim().toLowerCase();
  const filteredCatalog = searchTerm
    ? catalog.filter((e) => e.name.toLowerCase().includes(searchTerm))
    : selectedMuscle
      ? catalog.filter((e) => e.primaryMuscle === selectedMuscle)
      : [];

  const renderPendingItem = ({ item: ex, drag, isActive, getIndex }: RenderItemParams<PendingExercise>) => {
    const i = getIndex() ?? 0;
    return (
      <PendingExerciseCard
        exercise={ex}
        index={i}
        totalCount={pendingExercises.length}
        drag={drag}
        isActive={isActive}
        isNovice={isNovice}
        onMove={onMoveExercise}
        onUpdateSets={onUpdateSets}
        onUpdateRepRange={onUpdateRepRange}
        onRemove={onRemoveExercise}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <DraggableFlatList
        data={pendingExercises}
        keyExtractor={(_, i) => String(i)}
        onDragEnd={({ data }) => onReorderExercises(data)}
        renderItem={renderPendingItem}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {showBackButton && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={onGoBackToDayPicker}
              >
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.blockLabel}>Week {today.weekNumber} · RIR {today.targetRir}</Text>
            <Text style={styles.dayLabelText}>{today.dayLabel}</Text>
            <Text style={styles.buildSubtitle}>Build your workout by adding exercises</Text>
            <SettingsLink />
            {pendingExercises.length > 0 && (
              <Text style={{ color: COLORS.text_tertiary, fontSize: 12, marginBottom: SPACING.sm }}>
                Hold and drag to reorder
              </Text>
            )}
          </View>
        }
        ListFooterComponent={
          <View>
            <Text style={styles.sectionTitle}>Add Exercise</Text>
            <TextInput
              style={styles.exerciseSearchInput}
              placeholder="Search exercises..."
              placeholderTextColor={COLORS.text_tertiary}
              value={exerciseSearch}
              onChangeText={(text) => {
                onSetExerciseSearch(text);
                if (text.trim()) onSetSelectedMuscle(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                {suggestedMuscles.map((muscle) => (
                  <TouchableOpacity
                    key={muscle}
                    style={[styles.muscleChip, selectedMuscle === muscle && styles.muscleChipSelected]}
                    onPress={() => { onSetSelectedMuscle(selectedMuscle === muscle ? null : muscle); onSetExerciseSearch(''); }}
                  >
                    <Text style={[styles.muscleChipText, selectedMuscle === muscle && styles.muscleChipTextSelected]}>
                      {MUSCLE_LABELS[muscle] || muscle}
                    </Text>
                  </TouchableOpacity>
                ))}
                {Object.keys(MUSCLE_LABELS)
                  .filter((m) => !suggestedMuscles.includes(m))
                  .map((muscle) => (
                    <TouchableOpacity
                      key={muscle}
                      style={[styles.muscleChip, styles.muscleChipOther, selectedMuscle === muscle && styles.muscleChipSelected]}
                      onPress={() => { onSetSelectedMuscle(selectedMuscle === muscle ? null : muscle); onSetExerciseSearch(''); }}
                    >
                      <Text style={[styles.muscleChipText, styles.muscleChipTextOther, selectedMuscle === muscle && styles.muscleChipTextSelected]}>
                        {MUSCLE_LABELS[muscle] || muscle}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>

            {(selectedMuscle || searchTerm) && filteredCatalog.map((ex) => {
              const alreadyAdded = pendingExercises.some((p) => p.catalogId === ex.id);
              return (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.catalogCard, alreadyAdded && styles.catalogCardAdded]}
                  onPress={() => !alreadyAdded && onAddExercise(ex)}
                  disabled={alreadyAdded}
                >
                  <EquipmentIcon equipment={ex.equipment} size={20} color={alreadyAdded ? COLORS.text_tertiary : COLORS.text_secondary} />
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <Text style={[styles.catalogName, alreadyAdded && { color: COLORS.text_tertiary }]}>
                      {ex.name}
                    </Text>
                    <Text style={styles.catalogMeta}>
                      {ex.equipment} · {ex.movementType}
                    </Text>
                  </View>
                  {alreadyAdded ? (
                    <Text style={{ color: COLORS.success, fontSize: 13, fontWeight: '600' }}>Added</Text>
                  ) : (
                    <Text style={{ color: COLORS.accent_light, fontSize: 20, fontWeight: '700' }}>+</Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {searchTerm && filteredCatalog.length === 0 && (
              <Text style={{ color: COLORS.text_tertiary, fontSize: 13, textAlign: 'center', marginTop: SPACING.xl }}>
                No exercises found for "{exerciseSearch.trim()}"
              </Text>
            )}
            {!selectedMuscle && !searchTerm && (
              <Text style={{ color: COLORS.text_tertiary, fontSize: 13, textAlign: 'center', marginTop: SPACING.xl }}>
                Search or tap a muscle group to browse exercises
              </Text>
            )}

            <TouchableOpacity
              style={styles.createExerciseToggle}
              onPress={() => onSetShowCreateExercise(!showCreateExercise)}
            >
              <Text style={styles.createExerciseToggleText}>
                {showCreateExercise ? '− Cancel' : '+ Create Custom Exercise'}
              </Text>
            </TouchableOpacity>

            {showCreateExercise && (
              <ExerciseCreateForm
                newExercise={newExercise}
                onChangeNewExercise={onSetNewExercise}
                onCreateCustomExercise={onCreateCustomExercise}
              />
            )}
          </View>
        }
      />

      {pendingExercises.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.startButton} onPress={onStartWorkout}>
            <Text style={styles.startButtonText}>
              Start Workout ({pendingExercises.length} exercise{pendingExercises.length !== 1 ? 's' : ''})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg_primary,
  },
  scroll: {
    padding: SPACING.xl,
    paddingBottom: 100,
  },
  blockLabel: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dayLabelText: {
    color: COLORS.text_primary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: SPACING.sm,
  },
  buildSubtitle: {
    color: COLORS.text_secondary,
    fontSize: 14,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text_primary,
    marginBottom: SPACING.md,
  },
  backBtn: {
    marginBottom: SPACING.md,
  },
  backBtnText: {
    color: COLORS.accent_primary,
    fontSize: 16,
    fontWeight: '600',
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
  muscleChipOther: {
    backgroundColor: COLORS.bg_elevated,
    borderColor: COLORS.border_subtle,
  },
  muscleChipText: {
    color: COLORS.accent_light,
    fontSize: 13,
    fontWeight: '600',
  },
  muscleChipTextSelected: {
    color: COLORS.text_on_accent,
  },
  muscleChipTextOther: {
    color: COLORS.text_secondary,
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
  createExerciseToggle: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  createExerciseToggleText: {
    color: COLORS.accent_primary,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    backgroundColor: COLORS.bg_primary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  startButton: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  startButtonText: {
    color: COLORS.text_on_accent,
    fontSize: 16,
    fontWeight: '700',
  },
});
