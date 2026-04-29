import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';
import MuscleGroupIcon from '../MuscleGroupIcon';
import SetRow from './SetRow';
import ExerciseSearchPanel from './ExerciseSearchPanel';
import { CatalogExercise, TodayContext } from '../../types/training';
import { kgToLbs } from '../../utils/setLogging';

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
  onFinishWorkout,
}: ActiveSessionProps) {
  const router = useRouter();
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

        <View style={styles.nowCard}>
          <View style={styles.nowLabelRow}>
            <Text style={styles.nowLabel}>Now Playing</Text>
            <Text style={styles.exerciseCounter}>{currentExercise + 1} / {exercises.length}</Text>
          </View>

          <View style={styles.nowMain}>
            <View style={styles.musclePanel}>
              <MuscleGroupIcon muscle={exercise.muscleGroup} size={128} framed={false} background={false} />
            </View>
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
              onPress={() => {
                onSetSelectedMuscle(exercise.muscleGroup);
                onSetExerciseSearch('');
                onSetShowAddExercise(!showAddExercise);
              }}
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
        </View>

        {allSetsComplete ? (
          <View style={styles.completionPanel}>
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
          </View>
        ) : (
          <>
            <View style={styles.upcomingSection}>
              <Text style={styles.upcomingTitle}>Upcoming Exercises</Text>
              {upcomingExercises.map(({ exercise: upcomingExercise, index }: any) => {
                const upcomingCompletedSets = upcomingExercise.sets.filter((set: any) => set.completed).length;
                return (
                  <TouchableOpacity
                    key={upcomingExercise.id}
                    style={styles.upcomingCard}
                    onPress={() => {
                      onSetCurrentExercise(index);
                      onSetActiveSetIdx(null);
                      onSetShowAddExercise(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.upcomingName}>{upcomingExercise.exerciseName}</Text>
                      <Text style={styles.upcomingMeta}>
                        {MUSCLE_LABELS[upcomingExercise.muscleGroup] || upcomingExercise.muscleGroup} · {upcomingCompletedSets}/{upcomingExercise.sets.length} sets
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.upcomingSwap}
                      onPress={() => {
                        onSetCurrentExercise(index);
                        onSetSelectedMuscle(upcomingExercise.muscleGroup);
                        onSetExerciseSearch('');
                        onSetShowAddExercise(true);
                      }}
                    >
                      <Text style={styles.upcomingSwapText}>Swap</Text>
                    </TouchableOpacity>
                    <Text style={styles.dragHint}>|||</Text>
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
            title={`Swap ${exercise.exerciseName}`}
            addLabel="Start"
          />
        )}
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: COLORS.bg_elevated,
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
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  musclePanel: {
    width: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -SPACING.sm,
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
    backgroundColor: COLORS.bg_card,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
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
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent_primary,
    padding: SPACING.xl,
    alignItems: 'center',
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
});
