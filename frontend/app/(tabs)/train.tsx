import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { MUSCLE_LABELS } from '../../src/constants/training';
import { useTrainSession } from '../../src/hooks/useTrainSession';
import DayPicker from '../../src/components/Training/DayPicker';
import BuildMode from '../../src/components/Training/BuildMode';
import ActiveSession from '../../src/components/Training/ActiveSession';

export default function Train() {
  const router = useRouter();
  const {
    loading,
    today,
    session,
    currentExercise,
    activeSetIdx,
    setInputs,
    showAddExercise,
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
  } = useTrainSession();

  const SettingsLink = () => (
    <TouchableOpacity
      style={styles.settingsLink}
      onPress={() => router.push('/plan-settings')}
    >
      <Text style={styles.settingsLinkText}>Plan Settings</Text>
    </TouchableOpacity>
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

  if (choosingDay && !session && today.dayOptions) {
    return <DayPicker today={today} onStartDay={startDay} SettingsLink={SettingsLink} />;
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
        onReorderExercises={setPendingExercises}
        onStartWorkout={startWorkout}
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
