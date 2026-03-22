import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import SetRow from './SetRow';
import ExerciseHeader from './ExerciseHeader';
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
  onAddExerciseToSession: (ex: CatalogExercise) => void;
  onFinishWorkout: () => void;
}

export default function ActiveSession({
  today,
  session,
  currentExercise,
  activeSetIdx,
  setInputs,
  showAddExercise,
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
  const exercises = session.exercises;
  const exercise = exercises[currentExercise];
  const completedSets = exercises.flatMap((e: any) => e.sets).filter((s: any) => s.completed).length;
  const totalSets = exercises.flatMap((e: any) => e.sets).length;
  const exerciseCompletedSets = exercise.sets.filter((s: any) => s.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.workoutHeader}>
          <View>
            <Text style={styles.blockLabel}>Week {today.weekNumber} · RIR {today.targetRir}</Text>
            <Text style={styles.dayLabelText}>{today.dayLabel}</Text>
          </View>
        </View>

        <ExerciseHeader
          exercise={exercise}
          exerciseCount={exercises.length}
          completedSets={exerciseCompletedSets}
          onAddSet={onAddSetToExercise}
          onRemoveSet={onRemoveSetFromExercise}
          onRemoveExercise={onRemoveExerciseFromSession}
        />

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

        <View style={styles.inlineSetControls}>
          <TouchableOpacity
            style={styles.inlineSetBtn}
            onPress={() => onRemoveSetFromExercise(exercise.id)}
            disabled={exercise.sets.length <= 1}
          >
            <Text style={[styles.inlineSetBtnText, exercise.sets.length <= 1 && { opacity: 0.25 }]}>Remove Set</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inlineSetBtn}
            onPress={() => onAddSetToExercise(exercise.id)}
            disabled={exercise.sets.length >= 10}
          >
            <Text style={[styles.inlineSetBtnText, { color: COLORS.accent_light }, exercise.sets.length >= 10 && { opacity: 0.25 }]}>Add Set</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.exerciseNav}>
          {currentExercise > 0 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => { onSetCurrentExercise(currentExercise - 1); onSetActiveSetIdx(null); onSetShowAddExercise(false); }}
            >
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          {currentExercise < exercises.length - 1 ? (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrimary]}
              onPress={() => { onSetCurrentExercise(currentExercise + 1); onSetActiveSetIdx(null); onSetShowAddExercise(false); }}
            >
              <Text style={styles.navButtonPrimaryText}>Next Exercise</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrimary]}
              onPress={() => onSetShowAddExercise(!showAddExercise)}
            >
              <Text style={styles.navButtonPrimaryText}>Add Exercise</Text>
            </TouchableOpacity>
          )}
        </View>

        {showAddExercise && (
          <ExerciseSearchPanel
            catalog={catalog}
            exerciseSearch={exerciseSearch}
            setExerciseSearch={onSetExerciseSearch}
            selectedMuscle={selectedMuscle}
            setSelectedMuscle={onSetSelectedMuscle}
            existingIds={exercises.map((e: any) => e.catalogId)}
            onAddExercise={onAddExerciseToSession}
          />
        )}

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Workout Progress</Text>
            <Text style={styles.progressValue}>{completedSets}/{totalSets} sets</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }]} />
          </View>
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
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  exerciseNav: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  navButton: {
    flex: 1,
    padding: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  navButtonText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  navButtonPrimary: {
    backgroundColor: COLORS.accent_primary,
    borderColor: COLORS.accent_primary,
  },
  navButtonPrimaryText: {
    color: COLORS.text_on_accent,
    fontSize: 14,
    fontWeight: '700',
  },
  progressSection: {
    marginTop: SPACING.xl,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: COLORS.text_tertiary,
    fontSize: 11,
  },
  progressValue: {
    color: COLORS.text_secondary,
    fontSize: 11,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: COLORS.bg_input,
    borderRadius: 2,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: COLORS.accent_primary,
    borderRadius: 2,
  },
  inlineSetControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  inlineSetBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  inlineSetBtnText: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    fontWeight: '600',
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
});
