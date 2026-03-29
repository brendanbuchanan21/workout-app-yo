import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { MUSCLE_LABELS, SPLIT_LABELS } from '../../src/constants/training';
import { useAuth } from '../../src/context/AuthContext';
import { useTrainSession } from '../../src/hooks/useTrainSession';
import DayPicker from '../../src/components/Training/DayPicker';
import BuildMode from '../../src/components/Training/BuildMode';
import ActiveSession from '../../src/components/Training/ActiveSession';

export default function Train() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    loading,
    today,
    trainingBlock,
    session,
    workoutActive,
    currentExercise,
    activeSetIdx,
    setInputs,
    showAddExercise,
    allSetsComplete,
    workoutDuration,
    buildMode,
    choosingDay,
    catalog,
    selectedMuscle,
    exerciseSearch,
    pendingExercises,
    showCreateExercise,
    newExercise,
    setCurrentExercise,
    setActiveSetIdx,
    setSetInputs,
    setShowAddExercise,
    setSelectedMuscle,
    setExerciseSearch,
    setPendingExercises,
    setShowCreateExercise,
    setNewExercise,
    addExercise,
    createCustomExercise,
    removeExercise,
    moveExercise,
    updateSets,
    updateRepRange,
    startWorkout,
    openSetInput,
    logSet,
    finishWorkout,
    addSetToExercise,
    removeSetFromExercise,
    removeExerciseFromSession,
    addExerciseToSession,
    startDay,
    goBackToDayPicker,
    beginWorkout,
  } = useTrainSession();

  const SettingsLink = () => (
    <TouchableOpacity
      style={styles.settingsLink}
      onPress={() => router.push('/plan-settings')}
    >
      <Text style={styles.settingsLinkText}>Plan Settings</Text>
    </TouchableOpacity>
  );

  const MyProgramLink = () => (
    today ? (
      <TouchableOpacity style={styles.myProgramCard} onPress={() => router.push('/my-program')}>
        <View style={{ flex: 1 }}>
          <Text style={styles.myProgramLabel}>MY PROGRAM</Text>
          <Text style={styles.myProgramTitle}>
            {SPLIT_LABELS[today.splitType] || today.splitType}
          </Text>
        </View>
        <Text style={styles.myProgramArrow}>›</Text>
      </TouchableOpacity>
    ) : null
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent_primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!today) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl }}>
          <Text style={styles.emptyTitle}>No Active Plan</Text>
          <Text style={styles.emptyText}>Set up your training from the home screen to get started.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Landing page — shown before user starts a workout
  if (!workoutActive) {
    const nextDay = today.dayOptions?.find((d) => !d.completed);
    const completedCount = today.dayOptions?.filter((d) => d.completed).length || 0;
    const totalDays = today.dayOptions?.length || trainingBlock?.daysPerWeek || 0;
    const allDone = completedCount === totalDays && totalDays > 0;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.blockLabel}>
            Week {today.weekNumber} of {trainingBlock?.lengthWeeks || '?'} · RIR {today.targetRir}
          </Text>

          {/* My Program */}
          <MyProgramLink />

          {/* Begin Workout */}
          {!allDone && (
            <View style={styles.beginCard}>
              <Text style={styles.beginLabel}>NEXT UP</Text>
              <Text style={styles.beginTitle}>{nextDay?.dayLabel || today.dayLabel}</Text>
              <Text style={styles.beginMuscles}>
                {(nextDay?.muscleGroups || today.suggestedMuscleGroups)
                  .map((m) => MUSCLE_LABELS[m] || m).join(', ')}
              </Text>
              <TouchableOpacity style={styles.beginButton} onPress={beginWorkout}>
                <Text style={styles.beginButtonText}>Begin Workout</Text>
              </TouchableOpacity>
            </View>
          )}

          {allDone && (
            <View style={styles.beginCard}>
              <Text style={styles.beginTitle}>Week Complete</Text>
              <Text style={styles.beginMuscles}>
                All {totalDays} sessions finished this week
              </Text>
            </View>
          )}

          {/* Week progress */}
          {today.dayOptions && today.dayOptions.length > 1 && (
            <View style={styles.weekProgress}>
              <Text style={styles.weekProgressTitle}>
                This Week ({completedCount} of {totalDays})
              </Text>
              <View style={styles.weekDayPills}>
                {today.dayOptions.map((option, i) => (
                  <View
                    key={i}
                    style={[
                      styles.weekDayPill,
                      option.completed && styles.weekDayPillDone,
                      option === nextDay && styles.weekDayPillNext,
                    ]}
                  >
                    <Text style={[
                      styles.weekDayPillText,
                      option.completed && styles.weekDayPillTextDone,
                      option === nextDay && styles.weekDayPillTextNext,
                    ]}>
                      {option.dayLabel}
                    </Text>
                    {option.completed && <Text style={styles.weekDayPillCheck}>✓</Text>}
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Active workout flow
  if (choosingDay && !session && today.dayOptions) {
    return <DayPicker today={today} onStartDay={startDay} SettingsLink={SettingsLink} MyProgramLink={MyProgramLink} />;
  }

  if (buildMode && !session) {
    return (
      <BuildMode
        today={today}
        catalog={catalog}
        pendingExercises={pendingExercises}
        selectedMuscle={selectedMuscle}
        exerciseSearch={exerciseSearch}
        showCreateExercise={showCreateExercise}
        newExercise={newExercise}
        onSetSelectedMuscle={setSelectedMuscle}
        onSetExerciseSearch={setExerciseSearch}
        onSetShowCreateExercise={setShowCreateExercise}
        onSetNewExercise={setNewExercise}
        onAddExercise={addExercise}
        onRemoveExercise={removeExercise}
        onMoveExercise={moveExercise}
        onUpdateSets={updateSets}
        onUpdateRepRange={updateRepRange}
        onReorderExercises={setPendingExercises}
        onStartWorkout={startWorkout}
        isNovice={user?.experienceLevel === 'beginner'}
        onCreateCustomExercise={createCustomExercise}
        onGoBackToDayPicker={goBackToDayPicker}
        showBackButton={!!(today.dayOptions && today.dayOptions.length > 1)}
        SettingsLink={SettingsLink}
      />
    );
  }

  if (session && session.exercises?.length > 0) {
    return (
      <ActiveSession
        today={today}
        session={session}
        currentExercise={currentExercise}
        activeSetIdx={activeSetIdx}
        setInputs={setInputs}
        showAddExercise={showAddExercise}
        allSetsComplete={allSetsComplete}
        workoutDuration={workoutDuration}
        exerciseSearch={exerciseSearch}
        selectedMuscle={selectedMuscle}
        catalog={catalog}
        onSetCurrentExercise={setCurrentExercise}
        onSetActiveSetIdx={setActiveSetIdx}
        onSetSetInputs={setSetInputs}
        onSetShowAddExercise={setShowAddExercise}
        onSetExerciseSearch={setExerciseSearch}
        onSetSelectedMuscle={setSelectedMuscle}
        onOpenSetInput={openSetInput}
        onLogSet={logSet}
        onAddSetToExercise={addSetToExercise}
        onRemoveSetFromExercise={removeSetFromExercise}
        onRemoveExerciseFromSession={removeExerciseFromSession}
        onAddExerciseToSession={addExerciseToSession}
        onFinishWorkout={finishWorkout}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.blockLabel}>Week {today.weekNumber} · RIR {today.targetRir}</Text>
        <MyProgramLink />
        <Text style={styles.dayLabelText}>{today.dayLabel}</Text>
        <Text style={{ color: COLORS.text_secondary, fontSize: 14, marginBottom: SPACING.md }}>
          {today.suggestedMuscleGroups.map((m) => MUSCLE_LABELS[m] || m).join(', ')}
        </Text>
        <SettingsLink />
        <Text style={[styles.emptyText, { marginTop: SPACING.xl }]}>No workout created for today yet.</Text>
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text_primary,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  // My Program card
  myProgramCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  myProgramLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  myProgramTitle: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '600',
  },
  myProgramArrow: {
    color: COLORS.text_tertiary,
    fontSize: 22,
    fontWeight: '300',
  },
  // Begin Workout card
  beginCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent_primary,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  beginLabel: {
    color: COLORS.accent_primary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  beginTitle: {
    color: COLORS.text_primary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  beginMuscles: {
    color: COLORS.text_secondary,
    fontSize: 14,
    marginBottom: SPACING.lg,
  },
  beginButton: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  beginButtonText: {
    color: COLORS.text_on_accent,
    fontSize: 16,
    fontWeight: '700',
  },
  // Week progress
  weekProgress: {
    marginBottom: SPACING.lg,
  },
  weekProgressTitle: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  weekDayPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  weekDayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  weekDayPillDone: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success_subtle,
  },
  weekDayPillNext: {
    borderColor: COLORS.accent_primary,
  },
  weekDayPillText: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    fontWeight: '500',
  },
  weekDayPillTextDone: {
    color: COLORS.success,
  },
  weekDayPillTextNext: {
    color: COLORS.accent_primary,
  },
  weekDayPillCheck: {
    color: COLORS.success,
    fontSize: 12,
    marginLeft: SPACING.xs,
  },
  // Settings link
  settingsLink: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.lg,
  },
  settingsLinkText: {
    color: COLORS.accent_light,
    fontSize: 13,
    fontWeight: '600',
  },
});
