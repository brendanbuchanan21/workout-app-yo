import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';

import { apiGet, apiPost, apiPut, apiDelete } from '../../src/utils/api';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { MUSCLE_LABELS } from '../../src/constants/training';
import EquipmentIcon from '../../src/components/EquipmentIcon';

interface DayOption {
  dayLabel: string;
  muscleGroups: string[];
  completed?: boolean;
  exercises?: string[];
}

interface TodayContext {
  mesocycleId: string;
  weekNumber: number;
  dayIndex: number;
  dayLabel: string;
  dayOptions?: DayOption[];
  suggestedMuscleGroups: string[];
  targetRir: number;
  splitType: string;
  setupMethod: string | null;
  volumeTargets: Record<string, number>;
}

interface CatalogExercise {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
  movementType: string;
  repRangeLow: number;
  repRangeHigh: number;
}

interface SetPrescription {
  setNumber: number;
  targetWeightKg: number | null;
  targetReps: number | null;
  targetRir: number;
}

interface PendingExercise {
  catalogId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: number;
  repRangeLow: number;
  repRangeHigh: number;
  prescription?: SetPrescription[];
  adjustmentNote?: string | null;
}

export default function Train() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<TodayContext | null>(null);
  const [session, setSession] = useState<any>(null);
  const [currentExercise, setCurrentExercise] = useState(0);

  // Set logging state
  const [activeSetIdx, setActiveSetIdx] = useState<number | null>(null);
  const [setInputs, setSetInputs] = useState<{ weight: string; reps: string; rir: string }>({ weight: '', reps: '', rir: '' });
  const [lastPerformance, setLastPerformance] = useState<Record<string, any[]>>({});

  // Workout modification state
  const [showAddExercise, setShowAddExercise] = useState(false);

  // Build-as-you-go state
  const [buildMode, setBuildMode] = useState(false);
  const [choosingDay, setChoosingDay] = useState(false);
  const [chosenDay, setChosenDay] = useState<DayOption | null>(null);
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [pendingExercises, setPendingExercises] = useState<PendingExercise[]>([]);
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: '',
    primaryMuscle: '',
    equipment: '',
    movementType: 'compound' as 'compound' | 'isolation',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const todayRes = await apiGet('/training/today');
      if (!todayRes.ok) {
        setToday(null);
        setLoading(false);
        return;
      }
      const todayData = await todayRes.json();
      setToday(todayData);

      // Check for existing session today
      const mesoRes = await apiGet('/training/mesocycle/active');
      if (mesoRes.ok) {
        const mesoData = await mesoRes.json();
        const todaySessions = mesoData.mesocycle.workoutSessions?.filter(
          (s: any) => s.weekNumber === todayData.weekNumber && s.dayLabel === todayData.dayLabel
        ) || [];

        if (todaySessions.length > 0 && todaySessions[0].exercises?.length > 0) {
          setSession(todaySessions[0]);
          setBuildMode(false);
          setChoosingDay(false);
          // Load catalog for adding exercises mid-workout
          if (catalog.length === 0) {
            const catalogRes = await apiGet('/training/exercises');
            if (catalogRes.ok) {
              const catalogData = await catalogRes.json();
              setCatalog(catalogData.exercises);
            }
          }
        } else if (todayData.setupMethod === 'build_as_you_go') {
          // Show day picker first if there are options
          if (todayData.dayOptions && todayData.dayOptions.length > 1) {
            setChoosingDay(true);
            setChosenDay(null);
            setBuildMode(false);
          } else {
            setBuildMode(true);
            setChoosingDay(false);
          }
          // Pre-load exercise catalog
          const catalogRes = await apiGet('/training/exercises');
          if (catalogRes.ok) {
            const catalogData = await catalogRes.json();
            setCatalog(catalogData.exercises);
          }
        }
      }
    } catch (err) {
      console.error('Train load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Fetch last performance when current exercise changes
  useEffect(() => {
    if (session?.exercises?.length > 0) {
      const exercise = session.exercises[currentExercise];
      if (exercise?.catalogId) {
        fetchLastPerformance(exercise.catalogId);
      }
    }
  }, [session?.id, currentExercise]);

  const addExercise = (exercise: CatalogExercise) => {
    setPendingExercises([...pendingExercises, {
      catalogId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.primaryMuscle,
      sets: 3,
      repRangeLow: exercise.repRangeLow,
      repRangeHigh: exercise.repRangeHigh,
    }]);
    setSelectedMuscle(null);
  };

  const createCustomExercise = async () => {
    if (!newExercise.name.trim() || !newExercise.primaryMuscle || !newExercise.equipment) {
      Alert.alert('Missing Fields', 'Please fill in the name, muscle group, and equipment type.');
      return;
    }
    try {
      const res = await apiPost('/training/exercises', {
        name: newExercise.name.trim(),
        primaryMuscle: newExercise.primaryMuscle,
        equipment: newExercise.equipment,
        movementType: newExercise.movementType,
      });
      if (res.ok) {
        const data = await res.json();
        setCatalog([...catalog, data.exercise]);
        addExercise(data.exercise);
        setShowCreateExercise(false);
        setNewExercise({ name: '', primaryMuscle: '', equipment: '', movementType: 'compound' });
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to create exercise');
      }
    } catch (err) {
      console.error('Create exercise error:', err);
    }
  };

  const removeExercise = (index: number) => {
    setPendingExercises(pendingExercises.filter((_, i) => i !== index));
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= pendingExercises.length) return;
    const updated = [...pendingExercises];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setPendingExercises(updated);
  };

  const updateSets = (index: number, sets: number) => {
    const updated = [...pendingExercises];
    updated[index] = { ...updated[index], sets: Math.max(1, Math.min(10, sets)) };
    setPendingExercises(updated);
  };

  const startWorkout = async () => {
    if (!today || pendingExercises.length === 0) {
      Alert.alert('Add exercises', 'Add at least one exercise to start your workout');
      return;
    }

    try {
      const res = await apiPost('/training/session/create', {
        dayLabel: today.dayLabel,
        exercises: pendingExercises.map((ex) => ({
          catalogId: ex.catalogId,
          exerciseName: ex.exerciseName,
          muscleGroup: ex.muscleGroup,
          sets: ex.sets,
          repRangeLow: ex.repRangeLow,
          repRangeHigh: ex.repRangeHigh,
          prescription: ex.prescription,
        })),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create session');
      }
      const data = await res.json();
      setSession(data.session);
      setBuildMode(false);
      setCurrentExercise(0);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const fetchLastPerformance = async (catalogId: string) => {
    if (!catalogId || lastPerformance[catalogId]) return;
    try {
      const res = await apiGet(`/training/exercise/${catalogId}/last-performance`);
      if (res.ok) {
        const data = await res.json();
        setLastPerformance((prev) => ({ ...prev, [catalogId]: data.sets }));
      }
    } catch (err) {
      console.error('Fetch last performance error:', err);
    }
  };

  const kgToLbs = (kg: number) => Math.round(kg * 2.20462);

  const openSetInput = (exerciseIdx: number, setIdx: number) => {
    if (!session) return;
    const exercise = session.exercises[exerciseIdx];
    const set = exercise.sets[setIdx];

    if (set.completed) {
      // Tapping a completed set un-completes it
      uncompleteSet(exerciseIdx, setIdx);
      return;
    }

    // Pre-fill priority: 1) this set's own values, 2) estimate from previous sets, 3) last session history
    const hasOwnData = set.actualWeightKg != null || set.actualReps != null || set.actualRir != null;

    if (hasOwnData) {
      setActiveSetIdx(setIdx);
      setSetInputs({
        weight: set.actualWeightKg != null ? String(kgToLbs(set.actualWeightKg)) : '',
        reps: set.actualReps != null ? String(set.actualReps) : '',
        rir: set.actualRir != null ? String(set.actualRir) : '',
      });
      return;
    }

    // Find completed sets in this exercise to estimate from
    const completedSets = exercise.sets.filter((s: any) => s.completed && s.actualReps != null);
    const history = exercise.catalogId ? lastPerformance[exercise.catalogId] : null;

    let weight = '';
    let reps = '';
    let rir = '';

    if (completedSets.length > 0) {
      // Use set 1 as the baseline for fatigue estimation
      const firstSet = completedSets[0];
      const set1Reps = firstSet.actualReps;
      const targetRir = firstSet.actualRir ?? today?.targetRir ?? 3;

      // Retention factors for sets to failure at ~2 min rest (research-based)
      const failureRetention = [1.0, 0.70, 0.55, 0.50, 0.45];
      // Training with RIR reduces the drop-off: higher RIR = less fatigue accumulation
      const rirModifier: Record<number, number> = { 0: 1.0, 1: 0.73, 2: 0.55, 3: 0.45 };
      const modifier = rirModifier[Math.min(targetRir, 3)] ?? 0.45;

      const setPosition = setIdx; // 0-indexed position in the exercise
      const retentionAtFailure = failureRetention[Math.min(setPosition, failureRetention.length - 1)];
      // Adjust: retention = 1 - (dropOff * modifier)
      const dropOff = 1 - retentionAtFailure;
      const adjustedRetention = 1 - (dropOff * modifier);

      const lastDone = completedSets[completedSets.length - 1];
      weight = lastDone.actualWeightKg != null ? String(kgToLbs(lastDone.actualWeightKg)) : '';
      const estimatedReps = set1Reps != null ? Math.max(1, Math.round(set1Reps * adjustedRetention)) : null;
      reps = estimatedReps != null ? String(estimatedReps) : '';
      rir = targetRir != null ? String(targetRir) : '';
    } else if (set.targetWeightKg != null || set.targetReps != null) {
      // Use prescription targets
      weight = set.targetWeightKg != null ? String(kgToLbs(set.targetWeightKg)) : '';
      reps = set.targetReps != null ? String(set.targetReps) : '';
      rir = set.targetRir != null ? String(set.targetRir) : '';
    } else if (history && history.length > 0) {
      const historySet = history.find((s: any) => s.setNumber === set.setNumber) || history[0];
      weight = historySet?.actualWeightKg != null ? String(kgToLbs(historySet.actualWeightKg)) : '';
      reps = historySet?.actualReps != null ? String(historySet.actualReps) : '';
      rir = historySet?.actualRir != null ? String(historySet.actualRir) : '';
    }

    setActiveSetIdx(setIdx);
    setSetInputs({ weight, reps, rir });
  };

  const logSet = async (exerciseIdx: number, setIdx: number) => {
    if (!session) return;
    const set = session.exercises[exerciseIdx].sets[setIdx];
    const weightLbs = setInputs.weight.trim() ? parseFloat(setInputs.weight) : undefined;
    const weightKg = weightLbs != null ? Math.round(weightLbs / 2.20462 * 100) / 100 : undefined;
    const reps = setInputs.reps.trim() ? parseInt(setInputs.reps, 10) : undefined;
    const rir = setInputs.rir.trim() ? parseInt(setInputs.rir, 10) : undefined;

    try {
      const res = await apiPut(`/training/set/${set.id}/log`, {
        completed: true,
        actualWeightKg: weightKg,
        actualReps: reps,
        actualRir: rir,
      });
      if (res.ok) {
        const data = await res.json();
        const updated = { ...session };
        updated.exercises = [...updated.exercises];
        updated.exercises[exerciseIdx] = { ...updated.exercises[exerciseIdx] };
        updated.exercises[exerciseIdx].sets = [...updated.exercises[exerciseIdx].sets];
        updated.exercises[exerciseIdx].sets[setIdx] = data.set;
        setSession(updated);
        setActiveSetIdx(null);
      }
    } catch (err) {
      console.error('Log set error:', err);
    }
  };

  const uncompleteSet = async (exerciseIdx: number, setIdx: number) => {
    if (!session) return;
    const set = session.exercises[exerciseIdx].sets[setIdx];
    try {
      const res = await apiPut(`/training/set/${set.id}/log`, { completed: false });
      if (res.ok) {
        const data = await res.json();
        const updated = { ...session };
        updated.exercises = [...updated.exercises];
        updated.exercises[exerciseIdx] = { ...updated.exercises[exerciseIdx] };
        updated.exercises[exerciseIdx].sets = [...updated.exercises[exerciseIdx].sets];
        updated.exercises[exerciseIdx].sets[setIdx] = data.set;
        setSession(updated);
      }
    } catch (err) {
      console.error('Uncomplete set error:', err);
    }
  };

  const finishWorkout = async () => {
    if (!session) return;
    try {
      const res = await apiPut(`/training/session/${session.id}/complete`, {});
      if (res.ok) {
        const data = await res.json();
        setSession(null);
        router.push({
          pathname: '/workout-summary',
          params: {
            summary: JSON.stringify(data.summary),
            dayLabel: session.dayLabel || '',
            weekNumber: String(session.weekNumber || ''),
          },
        });
      }
    } catch (err) {
      console.error('Finish workout error:', err);
    }
  };

  const addSetToExercise = async (exerciseId: string) => {
    if (!session) return;
    try {
      const res = await apiPost(`/training/exercise/${exerciseId}/set`, {});
      if (res.ok) {
        const data = await res.json();
        const updated = { ...session };
        updated.exercises = updated.exercises.map((e: any) =>
          e.id === exerciseId ? { ...e, sets: [...e.sets, data.set] } : e
        );
        setSession(updated);
      }
    } catch (err) {
      console.error('Add set error:', err);
    }
  };

  const removeSetFromExercise = async (exerciseId: string) => {
    if (!session) return;
    try {
      const res = await apiDelete(`/training/exercise/${exerciseId}/set`);
      if (res.ok) {
        const data = await res.json();
        const updated = { ...session };
        updated.exercises = updated.exercises.map((e: any) =>
          e.id === exerciseId ? { ...e, sets: e.sets.filter((s: any) => s.id !== data.removed) } : e
        );
        setSession(updated);
        if (activeSetIdx !== null && activeSetIdx >= updated.exercises[currentExercise].sets.length) {
          setActiveSetIdx(null);
        }
      }
    } catch (err) {
      console.error('Remove set error:', err);
    }
  };

  const removeExerciseFromSession = async (exerciseId: string) => {
    if (!session) return;
    try {
      const res = await apiDelete(`/training/session/${session.id}/exercise/${exerciseId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        if (currentExercise >= data.session.exercises.length) {
          setCurrentExercise(Math.max(0, data.session.exercises.length - 1));
        }
        setActiveSetIdx(null);
      }
    } catch (err) {
      console.error('Remove exercise error:', err);
    }
  };

  const addExerciseToSession = async (ex: CatalogExercise) => {
    if (!session) return;
    try {
      const res = await apiPost(`/training/session/${session.id}/exercise`, {
        catalogId: ex.id,
        exerciseName: ex.name,
        muscleGroup: ex.primaryMuscle,
        sets: 3,
        repRangeLow: ex.repRangeLow,
        repRangeHigh: ex.repRangeHigh,
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setShowAddExercise(false);
        setExerciseSearch('');
        setSelectedMuscle(null);
      }
    } catch (err) {
      console.error('Add exercise to session error:', err);
    }
  };

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

  const SettingsLink = () => (
    <TouchableOpacity
      style={styles.settingsLink}
      onPress={() => router.push('/plan-settings')}
    >
      <Text style={styles.settingsLinkText}>Plan Settings</Text>
    </TouchableOpacity>
  );

  // DAY PICKER — choose which day to train
  if (choosingDay && !session && today.dayOptions) {
    const completedDays = today.dayOptions.filter((d) => d.completed);
    const nextDay = today.dayOptions.find((d) => !d.completed);
    const totalDays = today.dayOptions.length;
    const completedCount = completedDays.length;
    const allDone = completedCount === totalDays;

    const startDay = async (option: DayOption) => {
      setChosenDay(option);
      setChoosingDay(false);
      setToday({ ...today, dayLabel: option.dayLabel, suggestedMuscleGroups: option.muscleGroups });

      // Check for prescription from previous session
      try {
        const res = await apiGet(`/training/prescription/${encodeURIComponent(option.dayLabel)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.prescription && data.prescription.exercises.length > 0) {
            // Pre-fill pending exercises from prescription
            const prescribed: PendingExercise[] = data.prescription.exercises.map((ex: any) => ({
              catalogId: ex.catalogId || '',
              exerciseName: ex.exerciseName,
              muscleGroup: ex.muscleGroup,
              sets: ex.sets.length,
              repRangeLow: Math.min(...ex.sets.map((s: any) => s.targetReps || 6)),
              repRangeHigh: Math.max(...ex.sets.map((s: any) => s.targetReps || 12)),
              prescription: ex.sets,
              adjustmentNote: ex.adjustmentNote,
            }));
            setPendingExercises(prescribed);
            setBuildMode(true);
            return;
          }
        }
      } catch (err) {
        console.error('Prescription fetch error:', err);
      }

      setBuildMode(true);
    };

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.mesoLabel}>Week {today.weekNumber} · RIR {today.targetRir}</Text>
          <SettingsLink />

          {/* Next Up Card */}
          {nextDay && !allDone && (
            <View style={styles.nextUpCard}>
              <Text style={styles.nextUpLabel}>Next Up</Text>
              <Text style={styles.nextUpTitle}>{nextDay.dayLabel}</Text>
              <Text style={styles.nextUpMuscles}>
                {nextDay.muscleGroups.map((m) => MUSCLE_LABELS[m] || m).join(', ')}
              </Text>
              <TouchableOpacity style={styles.startWorkoutBtn} onPress={() => startDay(nextDay)}>
                <Text style={styles.startWorkoutBtnText}>Start Workout</Text>
              </TouchableOpacity>
            </View>
          )}

          {allDone && (
            <View style={styles.nextUpCard}>
              <Text style={styles.nextUpTitle}>Week Complete</Text>
              <Text style={styles.nextUpMuscles}>All {totalDays} sessions finished this week</Text>
            </View>
          )}

          {/* Weekly Progress */}
          <View style={styles.weekProgressSection}>
            <Text style={styles.weekProgressTitle}>
              This Week ({completedCount} of {totalDays})
            </Text>
            <View style={styles.weekDayPills}>
              {today.dayOptions.map((option, i) => {
                const isNext = !option.completed && option === nextDay;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.weekDayPill,
                      option.completed && styles.weekDayPillDone,
                      isNext && styles.weekDayPillNext,
                    ]}
                    onPress={() => {
                      if (!option.completed) startDay(option);
                    }}
                    activeOpacity={option.completed ? 1 : 0.7}
                  >
                    <Text style={[
                      styles.weekDayPillText,
                      option.completed && styles.weekDayPillTextDone,
                      isNext && styles.weekDayPillTextNext,
                    ]}>
                      {option.dayLabel}
                    </Text>
                    {option.completed && <Text style={styles.weekDayPillCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Completed Sessions Detail */}
          {completedDays.length > 0 && (
            <View style={styles.completedSection}>
              <Text style={styles.completedSectionTitle}>Completed</Text>
              {completedDays.map((day, i) => (
                <View key={i} style={styles.completedDayRow}>
                  <Text style={styles.completedDayLabel}>{day.dayLabel}</Text>
                  <Text style={styles.completedDayExercises}>
                    {day.exercises && day.exercises.length > 0
                      ? day.exercises.join(', ')
                      : day.muscleGroups.map((m) => MUSCLE_LABELS[m] || m).join(', ')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // BUILD MODE — picking exercises for build-as-you-go
  if (buildMode && !session) {
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
        <ScaleDecorator>
          <TouchableOpacity
            onLongPress={drag}
            disabled={isActive}
            activeOpacity={0.7}
            style={[styles.pendingCard, isActive && { opacity: 0.9, borderColor: COLORS.accent_primary }]}
          >
            <View style={styles.reorderButtons}>
              <TouchableOpacity
                onPress={() => moveExercise(i, -1)}
                style={styles.reorderBtn}
                disabled={i === 0}
              >
                <Text style={[styles.reorderBtnText, i === 0 && { opacity: 0.25 }]}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveExercise(i, 1)}
                style={styles.reorderBtn}
                disabled={i === pendingExercises.length - 1}
              >
                <Text style={[styles.reorderBtnText, i === pendingExercises.length - 1 && { opacity: 0.25 }]}>▼</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingName}>{ex.exerciseName}</Text>
              <Text style={styles.pendingMeta}>
                {MUSCLE_LABELS[ex.muscleGroup] || ex.muscleGroup}
                {ex.prescription ? ' · Prescribed' : ` · ${ex.repRangeLow}-${ex.repRangeHigh} reps`}
              </Text>
              {ex.adjustmentNote && (
                <Text style={styles.adjustmentNote}>{ex.adjustmentNote}</Text>
              )}
            </View>
            <View style={styles.setsControl}>
              <TouchableOpacity
                style={styles.setsBtn}
                onPress={() => updateSets(i, ex.sets - 1)}
              >
                <Text style={styles.setsBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.setsValue}>{ex.sets}</Text>
              <TouchableOpacity
                style={styles.setsBtn}
                onPress={() => updateSets(i, ex.sets + 1)}
              >
                <Text style={styles.setsBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => removeExercise(i)} style={{ paddingLeft: SPACING.md }}>
              <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '700' }}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </ScaleDecorator>
      );
    };

    return (
      <SafeAreaView style={styles.container}>
        <DraggableFlatList
          data={pendingExercises}
          keyExtractor={(_, i) => String(i)}
          onDragEnd={({ data }) => setPendingExercises(data)}
          renderItem={renderPendingItem}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              {today.dayOptions && today.dayOptions.length > 1 && (
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => {
                    setBuildMode(false);
                    setChoosingDay(true);
                    setChosenDay(null);
                    setPendingExercises([]);
                    setSelectedMuscle(null);
                    setExerciseSearch('');
                  }}
                >
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.mesoLabel}>Week {today.weekNumber} · RIR {today.targetRir}</Text>
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
              {/* Muscle group filter */}
              <Text style={styles.sectionTitle}>Add Exercise</Text>
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
                  {suggestedMuscles.map((muscle) => (
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
                  {Object.keys(MUSCLE_LABELS)
                    .filter((m) => !suggestedMuscles.includes(m))
                    .map((muscle) => (
                      <TouchableOpacity
                        key={muscle}
                        style={[styles.muscleChip, styles.muscleChipOther, selectedMuscle === muscle && styles.muscleChipSelected]}
                        onPress={() => { setSelectedMuscle(selectedMuscle === muscle ? null : muscle); setExerciseSearch(''); }}
                      >
                        <Text style={[styles.muscleChipText, styles.muscleChipTextOther, selectedMuscle === muscle && styles.muscleChipTextSelected]}>
                          {MUSCLE_LABELS[muscle] || muscle}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </ScrollView>

              {/* Exercise list */}
              {(selectedMuscle || searchTerm) && filteredCatalog.map((ex) => {
                const alreadyAdded = pendingExercises.some((p) => p.catalogId === ex.id);
                return (
                  <TouchableOpacity
                    key={ex.id}
                    style={[styles.catalogCard, alreadyAdded && styles.catalogCardAdded]}
                    onPress={() => !alreadyAdded && addExercise(ex)}
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

              {/* Create Custom Exercise */}
              <TouchableOpacity
                style={styles.createExerciseToggle}
                onPress={() => setShowCreateExercise(!showCreateExercise)}
              >
                <Text style={styles.createExerciseToggleText}>
                  {showCreateExercise ? '− Cancel' : '+ Create Custom Exercise'}
                </Text>
              </TouchableOpacity>

              {showCreateExercise && (
                <View style={styles.createExerciseForm}>
                  <TextInput
                    style={styles.createExerciseInput}
                    placeholder="Exercise name"
                    placeholderTextColor={COLORS.text_tertiary}
                    value={newExercise.name}
                    onChangeText={(text) => setNewExercise({ ...newExercise, name: text })}
                    autoCapitalize="words"
                  />

                  <Text style={styles.createExerciseLabel}>Muscle Group</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
                    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                      {Object.entries(MUSCLE_LABELS).map(([key, label]) => (
                        <TouchableOpacity
                          key={key}
                          style={[styles.muscleChip, newExercise.primaryMuscle === key && styles.muscleChipSelected]}
                          onPress={() => setNewExercise({ ...newExercise, primaryMuscle: key })}
                        >
                          <Text style={[styles.muscleChipText, newExercise.primaryMuscle === key && styles.muscleChipTextSelected]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={styles.createExerciseLabel}>Equipment</Text>
                  <View style={styles.createExerciseOptions}>
                    {['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'].map((eq) => (
                      <TouchableOpacity
                        key={eq}
                        style={[styles.optionChip, newExercise.equipment === eq && styles.optionChipSelected]}
                        onPress={() => setNewExercise({ ...newExercise, equipment: eq })}
                      >
                        <Text style={[styles.optionChipText, newExercise.equipment === eq && styles.optionChipTextSelected]}>
                          {eq.charAt(0).toUpperCase() + eq.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.createExerciseLabel}>Movement Type</Text>
                  <View style={styles.createExerciseOptions}>
                    {(['compound', 'isolation'] as const).map((mt) => (
                      <TouchableOpacity
                        key={mt}
                        style={[styles.optionChip, newExercise.movementType === mt && styles.optionChipSelected]}
                        onPress={() => setNewExercise({ ...newExercise, movementType: mt })}
                      >
                        <Text style={[styles.optionChipText, newExercise.movementType === mt && styles.optionChipTextSelected]}>
                          {mt.charAt(0).toUpperCase() + mt.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.createExerciseBtn} onPress={createCustomExercise}>
                    <Text style={styles.createExerciseBtnText}>Create & Add</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
        />

        {/* Start button */}
        {pendingExercises.length > 0 && (
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
              <Text style={styles.startButtonText}>
                Start Workout ({pendingExercises.length} exercise{pendingExercises.length !== 1 ? 's' : ''})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // WORKOUT IN PROGRESS — session exists
  if (session && session.exercises?.length > 0) {
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
              <Text style={styles.mesoLabel}>Week {today.weekNumber} · RIR {today.targetRir}</Text>
              <Text style={styles.dayLabelText}>{today.dayLabel}</Text>
            </View>
          </View>

          <View style={styles.exerciseHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.exerciseTitle}>{exercise.exerciseName}</Text>
              <Text style={styles.exerciseMeta}>
                {MUSCLE_LABELS[exercise.muscleGroup] || exercise.muscleGroup}
              </Text>
            </View>
            <View style={styles.setCountControl}>
              <TouchableOpacity
                onPress={() => removeSetFromExercise(exercise.id)}
                disabled={exercise.sets.length <= 1}
                style={styles.setCountBtn}
              >
                <Text style={[styles.setCountBtnText, exercise.sets.length <= 1 && { opacity: 0.25 }]}>-</Text>
              </TouchableOpacity>
              <View style={styles.setBadge}>
                <Text style={styles.setBadgeText}>{exerciseCompletedSets}/{exercise.sets.length} sets</Text>
              </View>
              <TouchableOpacity
                onPress={() => addSetToExercise(exercise.id)}
                disabled={exercise.sets.length >= 10}
                style={styles.setCountBtn}
              >
                <Text style={[styles.setCountBtnText, exercise.sets.length >= 10 && { opacity: 0.25 }]}>+</Text>
              </TouchableOpacity>
            </View>
            {exercises.length > 1 && (
              <TouchableOpacity
                style={{ paddingLeft: SPACING.md }}
                onPress={() => {
                  Alert.alert(
                    'Remove Exercise?',
                    `Remove ${exercise.exerciseName} from this workout?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeExerciseFromSession(exercise.id) },
                    ],
                  );
                }}
              >
                <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '700' }}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          {exercise.sets.map((set: any, i: number) => {
            const isEditing = activeSetIdx === i && !set.completed;
            return (
              <View key={set.id}>
                <TouchableOpacity
                  style={[styles.setRow, set.completed && styles.setRowCompleted, isEditing && styles.setRowActive]}
                  onPress={() => openSetInput(currentExercise, i)}
                >
                  <View style={[styles.setCircle, set.completed && styles.setCircleCompleted]}>
                    {set.completed ? (
                      <Text style={styles.checkmark}>✓</Text>
                    ) : (
                      <Text style={styles.setNum}>{set.setNumber}</Text>
                    )}
                  </View>
                  {set.completed ? (
                    <View style={styles.setDetails}>
                      <View style={styles.setDetail}>
                        <Text style={styles.setDetailLabel}>WEIGHT</Text>
                        <Text style={styles.setDetailValue}>{set.actualWeightKg != null ? `${kgToLbs(set.actualWeightKg)}` : '—'}</Text>
                      </View>
                      <View style={styles.setDetail}>
                        <Text style={styles.setDetailLabel}>REPS</Text>
                        <Text style={styles.setDetailValue}>{set.actualReps ?? '—'}</Text>
                      </View>
                      <View style={styles.setDetail}>
                        <Text style={styles.setDetailLabel}>RIR</Text>
                        <Text style={[styles.setDetailValue, { color: COLORS.accent_light }]}>{set.actualRir ?? '—'}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.setDetails}>
                      <Text style={{ color: COLORS.text_tertiary, fontSize: 13 }}>Tap to log</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {isEditing && (
                  <View style={styles.setInputRow}>
                    <View style={styles.setInputGroup}>
                      <Text style={styles.setInputLabel}>Weight</Text>
                      <TextInput
                        style={styles.setInput}
                        value={setInputs.weight}
                        onChangeText={(t) => setSetInputs((prev) => ({ ...prev, weight: t }))}
                        keyboardType="decimal-pad"
                        placeholder="—"
                        placeholderTextColor={COLORS.text_tertiary}
                        autoFocus
                      />
                    </View>
                    <View style={styles.setInputGroup}>
                      <Text style={styles.setInputLabel}>Reps</Text>
                      <TextInput
                        style={styles.setInput}
                        value={setInputs.reps}
                        onChangeText={(t) => setSetInputs((prev) => ({ ...prev, reps: t }))}
                        keyboardType="number-pad"
                        placeholder="—"
                        placeholderTextColor={COLORS.text_tertiary}
                      />
                    </View>
                    <View style={styles.setInputGroup}>
                      <Text style={styles.setInputLabel}>RIR</Text>
                      <TextInput
                        style={styles.setInput}
                        value={setInputs.rir}
                        onChangeText={(t) => setSetInputs((prev) => ({ ...prev, rir: t }))}
                        keyboardType="number-pad"
                        placeholder="—"
                        placeholderTextColor={COLORS.text_tertiary}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.setConfirmBtn}
                      onPress={() => logSet(currentExercise, i)}
                    >
                      <Text style={styles.setConfirmBtnText}>✓</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {/* Inline add/remove set controls below sets */}
          <View style={styles.inlineSetControls}>
            <TouchableOpacity
              style={styles.inlineSetBtn}
              onPress={() => removeSetFromExercise(exercise.id)}
              disabled={exercise.sets.length <= 1}
            >
              <Text style={[styles.inlineSetBtnText, exercise.sets.length <= 1 && { opacity: 0.25 }]}>Remove Set</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.inlineSetBtn}
              onPress={() => addSetToExercise(exercise.id)}
              disabled={exercise.sets.length >= 10}
            >
              <Text style={[styles.inlineSetBtnText, { color: COLORS.accent_light }, exercise.sets.length >= 10 && { opacity: 0.25 }]}>Add Set</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.exerciseNav}>
            {currentExercise > 0 && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => { setCurrentExercise(currentExercise - 1); setActiveSetIdx(null); setShowAddExercise(false); }}
              >
                <Text style={styles.navButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            {currentExercise < exercises.length - 1 ? (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary]}
                onPress={() => { setCurrentExercise(currentExercise + 1); setActiveSetIdx(null); setShowAddExercise(false); }}
              >
                <Text style={styles.navButtonPrimaryText}>Next Exercise</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary]}
                onPress={() => setShowAddExercise(!showAddExercise)}
              >
                <Text style={styles.navButtonPrimaryText}>Add Exercise</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Add Exercise panel */}
          {showAddExercise && (
            <View style={{ marginTop: SPACING.md }}>
              <Text style={styles.sectionTitle}>Add Exercise</Text>
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
              {(() => {
                const searchTerm = exerciseSearch.trim().toLowerCase();
                const filtered = searchTerm
                  ? catalog.filter((e) => e.name.toLowerCase().includes(searchTerm))
                  : selectedMuscle
                    ? catalog.filter((e) => e.primaryMuscle === selectedMuscle)
                    : [];
                return filtered.map((ex) => {
                  const alreadyInSession = exercises.some((e: any) => e.catalogId === ex.id);
                  return (
                    <TouchableOpacity
                      key={ex.id}
                      style={[styles.catalogCard, alreadyInSession && styles.catalogCardAdded]}
                      onPress={() => !alreadyInSession && addExerciseToSession(ex)}
                      disabled={alreadyInSession}
                    >
                      <EquipmentIcon equipment={ex.equipment} size={20} color={alreadyInSession ? COLORS.text_tertiary : COLORS.text_secondary} />
                      <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                        <Text style={[styles.catalogName, alreadyInSession && { color: COLORS.text_tertiary }]}>{ex.name}</Text>
                        <Text style={styles.catalogMeta}>{ex.equipment} · {ex.movementType}</Text>
                      </View>
                      {alreadyInSession ? (
                        <Text style={{ color: COLORS.success, fontSize: 13, fontWeight: '600' }}>Added</Text>
                      ) : (
                        <Text style={{ color: COLORS.accent_light, fontSize: 20, fontWeight: '700' }}>+</Text>
                      )}
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
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

          {/* End Workout */}
          <TouchableOpacity
            style={styles.endWorkoutBtn}
            onPress={() => {
              Alert.alert(
                'End Workout?',
                `${completedSets} of ${totalSets} sets completed. End now?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'End Workout', style: 'destructive', onPress: finishWorkout },
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

  // NO SESSION YET — preview for template/plan based
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.mesoLabel}>Week {today.weekNumber} · RIR {today.targetRir}</Text>
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
  mesoLabel: {
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

  // Back button
  backBtn: {
    marginBottom: SPACING.md,
  },
  backBtnText: {
    color: COLORS.accent_primary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Day picker — Next Up card
  nextUpCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent_primary,
    padding: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  nextUpLabel: {
    color: COLORS.accent_primary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  nextUpTitle: {
    color: COLORS.text_primary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  nextUpMuscles: {
    color: COLORS.text_secondary,
    fontSize: 14,
    marginBottom: SPACING.lg,
  },
  startWorkoutBtn: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  startWorkoutBtnText: {
    color: COLORS.text_on_accent,
    fontSize: 16,
    fontWeight: '700',
  },

  // Day picker — weekly progress
  weekProgressSection: {
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

  // Day picker — completed section
  completedSection: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
  },
  completedSectionTitle: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  completedDayRow: {
    marginBottom: SPACING.sm,
  },
  completedDayLabel: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  completedDayExercises: {
    color: COLORS.text_tertiary,
    fontSize: 13,
  },

  // Pending exercises
  pendingCard: {
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
  reorderButtons: {
    marginRight: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  reorderBtn: {
    padding: 2,
  },
  reorderBtnText: {
    color: COLORS.text_tertiary,
    fontSize: 10,
  },
  pendingName: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
  },
  pendingMeta: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    marginTop: 2,
  },
  adjustmentNote: {
    color: COLORS.warning,
    fontSize: 11,
    marginTop: 4,
  },
  setsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  setsBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bg_input,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  setsBtnText: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '700',
  },
  setsValue: {
    color: COLORS.accent_light,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
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

  // Muscle chips
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

  // Catalog
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

  // Create custom exercise
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
  createExerciseForm: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
  },
  createExerciseInput: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    color: COLORS.text_primary,
    fontSize: 15,
    marginBottom: SPACING.md,
  },
  createExerciseLabel: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  createExerciseOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  optionChipSelected: {
    borderColor: COLORS.accent_primary,
    backgroundColor: COLORS.accent_subtle,
  },
  optionChipText: {
    color: COLORS.text_tertiary,
    fontSize: 13,
  },
  optionChipTextSelected: {
    color: COLORS.accent_primary,
  },
  createExerciseBtn: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  createExerciseBtnText: {
    color: COLORS.text_on_accent,
    fontSize: 15,
    fontWeight: '700',
  },

  // Bottom bar
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

  // Workout execution
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  exerciseTitle: {
    color: COLORS.text_primary,
    fontSize: 17,
    fontWeight: '600',
  },
  exerciseMeta: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    marginTop: 2,
  },
  setCountControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  setCountBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bg_input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setCountBtnText: {
    color: COLORS.text_secondary,
    fontSize: 16,
    fontWeight: '700',
  },
  setBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: COLORS.accent_subtle,
  },
  setBadgeText: {
    color: COLORS.accent_light,
    fontSize: 11,
    fontWeight: '600',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  setRowCompleted: {
    backgroundColor: COLORS.accent_subtle,
    borderColor: 'rgba(232,145,45,0.2)',
  },
  setRowActive: {
    borderColor: COLORS.accent_primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  setInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    backgroundColor: COLORS.bg_secondary,
    padding: SPACING.md,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: COLORS.accent_primary,
    marginBottom: SPACING.sm,
  },
  setInputGroup: {
    flex: 1,
  },
  setInputLabel: {
    color: COLORS.text_tertiary,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  setInput: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  setConfirmBtn: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.sm,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setConfirmBtnText: {
    color: COLORS.text_on_accent,
    fontSize: 18,
    fontWeight: '700',
  },
  setCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.bg_input,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  setCircleCompleted: {
    backgroundColor: COLORS.accent_primary,
  },
  checkmark: {
    color: COLORS.text_on_accent,
    fontSize: 12,
    fontWeight: '700',
  },
  setNum: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '600',
  },
  setDetails: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  setDetail: {},
  setDetailLabel: {
    color: COLORS.text_tertiary,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setDetailValue: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '600',
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
