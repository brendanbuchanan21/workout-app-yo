import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';
import { CatalogExercise, TodayContext } from '../../types/training';
import { kgToLbs } from '../../utils/setLogging';
import { CardGradientSurface } from '../shared/CardGradientSurface';
import ExerciseSearchPanel from './ExerciseSearchPanel';
import SetRow from './SetRow';

interface ActiveSessionProps {
  today: TodayContext;
  session: any;
  currentExercise: number;
  activeSetIdx: number | null;
  setInputs: { weight: string; reps: string; rir: string };
  showAddExercise: boolean;
  allSetsComplete: boolean;
  workoutDuration: string;
  exerciseSearch: string;
  selectedMuscle: string | null;
  catalog: CatalogExercise[];
  onSetCurrentExercise: (idx: number) => void;
  onSetActiveSetIdx: (idx: number | null) => void;
  onSetSetInputs: (fn: (prev: { weight: string; reps: string; rir: string }) => { weight: string; reps: string; rir: string }) => void;
  onSetShowAddExercise: (show: boolean) => void;
  onSetExerciseSearch: (text: string) => void;
  onSetSelectedMuscle: (muscle: string | null) => void;
  onOpenSetInput: (exerciseIdx: number, setIdx: number) => void;
  onLogSet: (exerciseIdx: number, setIdx: number) => void;
  onAddSetToExercise: (exerciseId: string) => void;
  onRemoveSetFromExercise: (exerciseId: string) => void;
  onRemoveExerciseFromSession: (exerciseId: string) => void;
  onAddExerciseToSession: (ex: CatalogExercise, options?: { makeCurrent?: boolean }) => void;
  onReplaceExerciseInSession: (exerciseId: string, ex: CatalogExercise) => Promise<boolean>;
  onFinishWorkout: () => void;
}

export default function ActiveSession({
  today,
  session,
  currentExercise,
  activeSetIdx,
  setInputs,
  showAddExercise,
  allSetsComplete,
  workoutDuration,
  exerciseSearch,
  selectedMuscle,
  catalog,
  onSetCurrentExercise,
  onSetActiveSetIdx,
  onSetSetInputs,
  onSetShowAddExercise,
  onSetExerciseSearch,
  onSetSelectedMuscle,
  onOpenSetInput,
  onLogSet,
  onAddSetToExercise,
  onRemoveSetFromExercise,
  onRemoveExerciseFromSession,
  onAddExerciseToSession,
  onReplaceExerciseInSession,
  onFinishWorkout,
}: ActiveSessionProps) {
  const router = useRouter();
  const [swapExerciseIndex, setSwapExerciseIndex] = useState<number | null>(null);
  const [swapSearch, setSwapSearch] = useState('');
  const exercises = session.exercises;
  const exercise = exercises[currentExercise];
  const completedSets = exercises.flatMap((e: any) => e.sets).filter((s: any) => s.completed).length;
  const totalSets = exercises.flatMap((e: any) => e.sets).length;
  const exerciseCompletedSets = exercise.sets.filter((s: any) => s.completed).length;
  const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const activeSetIndex = exercise.sets.findIndex((set: any) => !set.completed);
  const displaySetIndex = activeSetIndex >= 0 ? activeSetIndex : exercise.sets.length - 1;
  const displaySet = exercise.sets[displaySetIndex] ?? exercise.sets[0];
  const targetSummaryParts = [
    displaySet?.targetReps != null ? `${displaySet.targetReps} reps` : null,
    displaySet?.targetWeightKg != null ? `@ ${kgToLbs(displaySet.targetWeightKg)} lbs` : null,
    displaySet?.targetRir != null ? `RIR ${displaySet.targetRir}` : null,
  ].filter(Boolean);
  const exerciseQueue = exercises
    .map((upcomingExercise: any, index: number) => ({ exercise: upcomingExercise, index }))
    .filter((item: any) => item.index !== currentExercise);
  const upcomingExercises = [
    ...exerciseQueue.filter((item: any) => item.index > currentExercise),
    ...exerciseQueue.filter((item: any) => item.index < currentExercise),
  ];
  const nextExercise = upcomingExercises.find((item: any) => item.index > currentExercise) ?? upcomingExercises[0];
  const currentMuscleLabel = MUSCLE_LABELS[exercise.muscleGroup] || exercise.muscleGroup;
  const swapTarget = swapExerciseIndex === null ? null : exercises[swapExerciseIndex];
  const replacementOptions = useMemo(() => {
    if (!swapTarget) {
      return { bestMatches: [] as CatalogExercise[], sameMuscle: [] as CatalogExercise[], searchResults: [] as CatalogExercise[] };
    }

    const targetCatalog = catalog.find((item) => item.id === swapTarget.catalogId);
    const usedCatalogIds = new Set(
      exercises
        .filter((item: any) => item.id !== swapTarget.id)
        .map((item: any) => item.catalogId)
        .filter(Boolean)
    );
    const available = catalog.filter((item) => item.id !== swapTarget.catalogId && !usedCatalogIds.has(item.id));
    const scoreExercise = (item: CatalogExercise) => {
      let score = 0;
      if (item.primaryMuscle === swapTarget.muscleGroup) score += 100;
      if (targetCatalog && item.movementType === targetCatalog.movementType) score += 28;
      if (targetCatalog && item.equipment === targetCatalog.equipment) score += 22;
      return score;
    };
    const ranked = available
      .map((item) => ({ item, score: scoreExercise(item) }))
      .filter(({ score }) => score >= 100)
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
    const bestMatches = ranked.slice(0, 6).map(({ item }) => item);
    const bestIds = new Set(bestMatches.map((item) => item.id));
    const sameMuscle = ranked
      .map(({ item }) => item)
      .filter((item) => !bestIds.has(item.id))
      .slice(0, 8);
    const query = swapSearch.trim().toLowerCase();
    const searchResults = query
      ? available
        .filter((item) => (
          item.name.toLowerCase().includes(query) ||
          item.equipment.toLowerCase().includes(query) ||
          item.movementType.toLowerCase().includes(query)
        ))
        .sort((a, b) => scoreExercise(b) - scoreExercise(a) || a.name.localeCompare(b.name))
        .slice(0, 20)
      : [];

    return { bestMatches, sameMuscle, searchResults };
  }, [catalog, exercises, swapSearch, swapTarget]);

  const openSwapSheet = (index: number) => {
    setSwapExerciseIndex(index);
    setSwapSearch('');
    onSetShowAddExercise(false);
  };

  const closeSwapSheet = () => {
    setSwapExerciseIndex(null);
    setSwapSearch('');
  };

  const replaceExercise = async (replacement: CatalogExercise) => {
    if (!swapTarget) return;
    const replaced = await onReplaceExerciseInSession(swapTarget.id, replacement);
    if (replaced) closeSwapSheet();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.timerText}>{workoutDuration}</Text>
            <Text style={styles.dayLabelText}>{today.dayLabel}</Text>
            <Text style={styles.progressLabel}>{completedSets} / {totalSets} sets completed</Text>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.blockLabel}>Week {today.weekNumber} · RIR {today.targetRir}</Text>
            <TouchableOpacity style={styles.myProgramBtn} onPress={() => router.push('/my-program')}>
              <Text style={styles.myProgramBtnText}>My Program</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        <CardGradientSurface gradientId={`activeNow-${exercise.id}`} style={styles.nowCard}>
          <View style={styles.nowLabelRow}>
            <Text style={styles.nowLabel}>Now Playing</Text>
            <Text style={styles.exerciseCounter}>{currentExercise + 1} / {exercises.length}</Text>
          </View>

          <View style={styles.nowMain}>
            <View style={styles.nowContent}>
              <Text style={styles.exerciseTitle}>{exercise.exerciseName}</Text>
              <Text style={styles.exerciseMuscle}>{currentMuscleLabel}</Text>
              <Text style={styles.setTargetLabel}>Set {displaySet?.setNumber ?? displaySetIndex + 1} / {exercise.sets.length}</Text>
              <Text style={styles.setTargetText}>
                {targetSummaryParts.length > 0 ? targetSummaryParts.join('  ') : 'Tap a set to log'}
              </Text>
              <View style={styles.setSummaryRow}>
                <View style={styles.setAdjuster}>
                  <TouchableOpacity
                    onPress={() => onRemoveSetFromExercise(exercise.id)}
                    disabled={exercise.sets.length <= 1}
                    style={styles.setRoundBtn}
                  >
                    <Text style={[styles.setRoundBtnText, exercise.sets.length <= 1 && styles.disabledControl]}>-</Text>
                  </TouchableOpacity>
                  <View style={styles.setCountBubble}>
                    <Text style={styles.setCountBubbleText}>{exercise.sets.length}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onAddSetToExercise(exercise.id)}
                    disabled={exercise.sets.length >= 10}
                    style={styles.setRoundBtn}
                  >
                    <Text style={[styles.setRoundBtnText, exercise.sets.length >= 10 && styles.disabledControl]}>+</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.workingSets}>
                  <Text style={styles.workingSetsLabel}>Working Sets</Text>
                  <Text style={styles.workingSetsValue}>{exerciseCompletedSets}/{exercise.sets.length}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.currentSetList}>
            {exercise.sets.map((set: any, i: number) => (
              <SetRow
                key={set.id}
                set={set}
                index={i}
                isEditing={activeSetIdx === i && !set.completed}
                exerciseIdx={currentExercise}
                kgToLbs={kgToLbs}
                onOpenSet={onOpenSetInput}
                onLogSet={onLogSet}
                setInputs={setInputs}
                setSetInputs={onSetSetInputs}
              />
            ))}
          </View>

          <View style={styles.nowActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openSwapSheet(currentExercise)}
            >
              <Text style={styles.actionButtonText}>Swap Exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              disabled={!nextExercise}
              onPress={() => {
                if (!nextExercise) return;
                onSetCurrentExercise(nextExercise.index);
                onSetActiveSetIdx(null);
                onSetShowAddExercise(false);
              }}
            >
              <Text style={[styles.actionButtonText, !nextExercise && styles.disabledControl]}>Skip for Now</Text>
            </TouchableOpacity>
          </View>
        </CardGradientSurface>

        {allSetsComplete ? (
          <CardGradientSurface gradientId="activeWorkoutComplete" style={styles.completionPanel}>
            <Text style={styles.completionTitle}>Workout Complete</Text>
            <Text style={styles.completionSubtitle}>
              All {totalSets} sets finished. Nice work.
            </Text>
            <TouchableOpacity
              style={styles.completeWorkoutBtn}
              onPress={onFinishWorkout}
            >
              <Text style={styles.completeWorkoutBtnText}>Complete Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addMoreBtn}
              onPress={() => onSetShowAddExercise(!showAddExercise)}
            >
              <Text style={styles.addMoreBtnText}>Add Another Exercise</Text>
            </TouchableOpacity>
          </CardGradientSurface>
        ) : (
          <>
            <View style={styles.upcomingSection}>
              <Text style={styles.upcomingTitle}>Upcoming Exercises</Text>
              {upcomingExercises.map(({ exercise: upcomingExercise, index }: any) => {
                const upcomingCompletedSets = upcomingExercise.sets.filter((set: any) => set.completed).length;
                return (
                  <TouchableOpacity
                    key={upcomingExercise.id}
                    activeOpacity={0.82}
                    onPress={() => {
                      onSetCurrentExercise(index);
                      onSetActiveSetIdx(null);
                      onSetShowAddExercise(false);
                    }}
                  >
                    <CardGradientSurface
                      gradientId={`activeUpcoming-${upcomingExercise.id}`}
                      style={styles.upcomingCard}
                    >
                      <View style={styles.upcomingCardInner}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.upcomingName}>{upcomingExercise.exerciseName}</Text>
                          <Text style={styles.upcomingMeta}>
                            {MUSCLE_LABELS[upcomingExercise.muscleGroup] || upcomingExercise.muscleGroup} · {upcomingCompletedSets}/{upcomingExercise.sets.length} sets
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.upcomingSwap}
                          onPress={(event) => {
                            event.stopPropagation();
                            openSwapSheet(index);
                          }}
                        >
                          <Text style={styles.upcomingSwapText}>Swap</Text>
                        </TouchableOpacity>
                        <Text style={styles.dragHint}>|||</Text>
                      </View>
                    </CardGradientSurface>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.addExerciseBtn}
                onPress={() => onSetShowAddExercise(!showAddExercise)}
              >
                <Text style={styles.addExerciseBtnText}>+ Add Exercise</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.endWorkoutBtn}
              onPress={() => {
                Alert.alert(
                  'End Workout?',
                  `${completedSets} of ${totalSets} sets completed. End now?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'End Workout', style: 'destructive', onPress: onFinishWorkout },
                  ],
                );
              }}
            >
              <Text style={styles.endWorkoutBtnText}>End Workout</Text>
            </TouchableOpacity>
          </>
        )}

        {showAddExercise && (
          <ExerciseSearchPanel
            catalog={catalog}
            exerciseSearch={exerciseSearch}
            setExerciseSearch={onSetExerciseSearch}
            selectedMuscle={selectedMuscle}
            setSelectedMuscle={onSetSelectedMuscle}
            existingIds={exercises.map((e: any) => e.catalogId)}
            onAddExercise={(ex) => onAddExerciseToSession(ex, { makeCurrent: true })}
            title="Add Exercise"
            addLabel="Add"
          />
        )}
        <ExerciseSwapSheet
          visible={!!swapTarget}
          targetExercise={swapTarget}
          options={replacementOptions}
          search={swapSearch}
          onSearch={setSwapSearch}
          onClose={closeSwapSheet}
          onReplace={replaceExercise}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ExerciseSwapSheet({
  visible,
  targetExercise,
  options,
  search,
  onSearch,
  onClose,
  onReplace,
}: {
  visible: boolean;
  targetExercise: any | null;
  options: {
    bestMatches: CatalogExercise[];
    sameMuscle: CatalogExercise[];
    searchResults: CatalogExercise[];
  };
  search: string;
  onSearch: (text: string) => void;
  onClose: () => void;
  onReplace: (exercise: CatalogExercise) => void;
}) {
  const muscleLabel = targetExercise
    ? MUSCLE_LABELS[targetExercise.muscleGroup] || targetExercise.muscleGroup
    : '';
  const hasSearch = search.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.swapBackdrop}>
        <TouchableOpacity style={styles.swapScrim} activeOpacity={1} onPress={onClose} />
        <View style={styles.swapSheet}>
          <View style={styles.swapHandle} />
          <View style={styles.swapHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.swapEyebrow}>Replace Exercise</Text>
              <Text style={styles.swapTitle} numberOfLines={1}>{targetExercise?.exerciseName}</Text>
              <Text style={styles.swapSubtitle}>{muscleLabel} · keep current set targets</Text>
            </View>
            <TouchableOpacity style={styles.swapCloseButton} onPress={onClose}>
              <Text style={styles.swapCloseText}>X</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.swapSearchInput}
            placeholder="Search all exercises"
            placeholderTextColor={COLORS.text_tertiary}
            value={search}
            onChangeText={onSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <ScrollView style={styles.swapList} showsVerticalScrollIndicator={false}>
            {hasSearch ? (
              <SwapOptionSection
                title="Search Results"
                exercises={options.searchResults}
                emptyText="No matching exercises"
                onReplace={onReplace}
              />
            ) : (
              <>
                <SwapOptionSection
                  title="Best Matches"
                  exercises={options.bestMatches}
                  emptyText="No close matches found"
                  onReplace={onReplace}
                />
                {options.sameMuscle.length > 0 && (
                  <SwapOptionSection
                    title={`More ${muscleLabel}`}
                    exercises={options.sameMuscle}
                    onReplace={onReplace}
                  />
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SwapOptionSection({
  title,
  exercises,
  emptyText,
  onReplace,
}: {
  title: string;
  exercises: CatalogExercise[];
  emptyText?: string;
  onReplace: (exercise: CatalogExercise) => void;
}) {
  return (
    <View style={styles.swapSection}>
      <Text style={styles.swapSectionTitle}>{title}</Text>
      {exercises.length > 0 ? exercises.map((exercise) => (
        <TouchableOpacity
          key={exercise.id}
          style={styles.swapOption}
          activeOpacity={0.82}
          onPress={() => onReplace(exercise)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.swapOptionName}>{exercise.name}</Text>
            <Text style={styles.swapOptionMeta}>
              {MUSCLE_LABELS[exercise.primaryMuscle] || exercise.primaryMuscle} · {exercise.equipment} · {exercise.movementType}
            </Text>
          </View>
          <Text style={styles.swapOptionAction}>Replace</Text>
        </TouchableOpacity>
      )) : emptyText ? (
        <Text style={styles.swapEmpty}>{emptyText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg_primary,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 100,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 118,
    marginBottom: SPACING.md,
  },
  heroRight: {
    alignItems: 'flex-end',
    gap: SPACING.lg,
    paddingTop: SPACING.md,
  },
  blockLabel: {
    color: COLORS.text_secondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  dayLabelText: {
    color: COLORS.text_primary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -1.2,
    textTransform: 'uppercase',
    marginTop: 2,
    marginBottom: SPACING.lg,
  },
  timerText: {
    color: COLORS.text_primary,
    fontSize: 24,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    marginTop: SPACING.md,
  },
  myProgramBtn: {
    paddingVertical: 9,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  myProgramBtnText: {
    color: COLORS.accent_light,
    fontSize: 12,
    fontWeight: '700',
  },
  progressLabel: {
    color: COLORS.text_secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 7,
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  progressBarFill: {
    height: 7,
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.full,
  },
  nowCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  nowLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  nowLabel: {
    color: COLORS.accent_light,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  exerciseCounter: {
    color: COLORS.text_secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  nowMain: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  nowContent: {
    flex: 1,
  },
  exerciseTitle: {
    color: COLORS.text_primary,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  exerciseMuscle: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
    marginBottom: SPACING.xs,
  },
  setTargetLabel: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  setTargetText: {
    color: COLORS.accent_light,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    lineHeight: 23,
  },
  setSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  setAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  setRoundBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.bg_input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setRoundBtnText: {
    color: COLORS.text_secondary,
    fontSize: 20,
    fontWeight: '800',
  },
  disabledControl: {
    opacity: 0.3,
  },
  setCountBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent_primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setCountBubbleText: {
    color: COLORS.text_on_accent,
    fontSize: 16,
    fontWeight: '900',
  },
  workingSets: {
    alignItems: 'flex-end',
  },
  workingSetsLabel: {
    color: COLORS.text_secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  workingSetsValue: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '700',
  },
  currentSetList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.sm,
  },
  nowActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg_secondary,
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.accent_light,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  upcomingSection: {
    marginTop: SPACING.sm,
  },
  upcomingTitle: {
    color: COLORS.text_primary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  upcomingCard: {
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  upcomingCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  upcomingName: {
    color: COLORS.text_primary,
    fontSize: 17,
    fontWeight: '800',
  },
  upcomingMeta: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  upcomingSwap: {
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg_card,
  },
  upcomingSwapText: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '800',
  },
  dragHint: {
    color: COLORS.text_tertiary,
    fontSize: 20,
    fontWeight: '700',
  },
  addExerciseBtn: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg_secondary,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  addExerciseBtnText: {
    color: COLORS.accent_light,
    fontSize: 15,
    fontWeight: '800',
  },
  endWorkoutBtn: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  endWorkoutBtnText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  completionPanel: {
    marginTop: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent_primary,
    padding: SPACING.xl,
    alignItems: 'center',
    overflow: 'hidden',
  },
  completionTitle: {
    color: COLORS.text_primary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  completionSubtitle: {
    color: COLORS.text_secondary,
    fontSize: 14,
    marginBottom: SPACING.xl,
  },
  completeWorkoutBtn: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.md,
  },
  completeWorkoutBtnText: {
    color: COLORS.text_on_accent,
    fontSize: 16,
    fontWeight: '700',
  },
  addMoreBtn: {
    paddingVertical: SPACING.sm,
  },
  addMoreBtnText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  swapBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  swapScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  swapSheet: {
    maxHeight: '82%',
    backgroundColor: COLORS.bg_secondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  swapHandle: {
    width: 42,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  swapHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  swapEyebrow: {
    color: COLORS.accent_light,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  swapTitle: {
    color: COLORS.text_primary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  swapSubtitle: {
    color: COLORS.text_secondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  swapCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg_input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapCloseText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '900',
  },
  swapSearchInput: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text_primary,
    fontSize: 15,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  swapList: {
    marginHorizontal: -SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  swapSection: {
    marginBottom: SPACING.lg,
  },
  swapSectionTitle: {
    color: COLORS.text_secondary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  swapOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    backgroundColor: COLORS.bg_card,
    marginBottom: SPACING.sm,
  },
  swapOptionName: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '800',
  },
  swapOptionMeta: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
    textTransform: 'capitalize',
  },
  swapOptionAction: {
    color: COLORS.accent_light,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  swapEmpty: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: SPACING.md,
  },
});
