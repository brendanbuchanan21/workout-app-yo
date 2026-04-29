import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { DayOption, TodayContext, CatalogExercise, PendingExercise } from '../types/training';
import { kgToLbs, estimateSetValues } from '../utils/setLogging';

export function useTrainSession() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<TodayContext | null>(null);
  const [trainingBlock, setTrainingBlock] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [workoutActive, setWorkoutActive] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(0);

  const [activeSetIdx, setActiveSetIdx] = useState<number | null>(null);
  const [setInputs, setSetInputs] = useState<{ weight: string; reps: string; rir: string }>({ weight: '', reps: '', rir: '' });
  const [lastPerformance, setLastPerformance] = useState<Record<string, any[]>>({});

  const [showAddExercise, setShowAddExercise] = useState(false);

  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (workoutStartTime) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workoutStartTime]);

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

      const blockRes = await apiGet('/training/block/active');
      if (blockRes.ok) {
        const blockData = await blockRes.json();
        setTrainingBlock(blockData.trainingBlock);
        const todaySessions = blockData.trainingBlock.workoutSessions?.filter(
          (s: any) => s.weekNumber === todayData.weekNumber && s.dayLabel === todayData.dayLabel
        ) || [];

        const todaysSession = todaySessions[0];

        if (todaysSession && todaysSession.exercises?.length > 0) {
          setSession(todaysSession);
          setBuildMode(false);
          setChoosingDay(false);
          const isStarted = todaysSession.status === 'in_progress';
          const hasLoggedSets = todaysSession.exercises.some(
            (e: any) => e.sets?.some((s: any) => s.completed)
          );
          setWorkoutActive(isStarted || hasLoggedSets);
          if ((isStarted || hasLoggedSets) && !workoutStartTime) {
            setWorkoutStartTime(Date.now());
          }
          if (catalog.length === 0) {
            const catalogRes = await apiGet('/training/exercises');
            if (catalogRes.ok) {
              const catalogData = await catalogRes.json();
              setCatalog(catalogData.exercises);
            }
          }
        } else if (todayData.setupMethod === 'build_as_you_go') {
          setWorkoutActive(false);
          if (todayData.dayOptions && todayData.dayOptions.length > 1) {
            setChoosingDay(true);
            setChosenDay(null);
            setBuildMode(false);
          } else {
            setBuildMode(true);
            setChoosingDay(false);
          }
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

  const updateRepRange = (index: number, low: number, high: number) => {
    const updated = [...pendingExercises];
    updated[index] = {
      ...updated[index],
      repRangeLow: Math.max(1, Math.min(low, high)),
      repRangeHigh: Math.max(low, Math.min(50, high)),
    };
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
      setWorkoutStartTime(Date.now());
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

  const openSetInput = (exerciseIdx: number, setIdx: number) => {
    if (!session) return;
    const exercise = session.exercises[exerciseIdx];
    const set = exercise.sets[setIdx];

    if (set.completed) {
      uncompleteSet(exerciseIdx, setIdx);
      return;
    }

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

    const completedSets = exercise.sets.filter((s: any) => s.completed && s.actualReps != null);
    const history = exercise.catalogId ? lastPerformance[exercise.catalogId] : null;

    let weight = '';
    let reps = '';
    let rir = '';

    if (completedSets.length > 0) {
      const targetRir = completedSets[0].actualRir ?? today?.targetRir ?? 3;
      const estimated = estimateSetValues(completedSets, setIdx, targetRir);
      weight = estimated.weight;
      reps = estimated.reps;
      rir = estimated.rir;
    } else if (set.targetWeightKg != null || set.targetReps != null) {
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

        // Check if all sets across all exercises are now complete
        const allComplete = updated.exercises.every(
          (e: any) => e.sets.every((s: any) => s.completed)
        );
        if (allComplete) {
          setCurrentExercise(updated.exercises.length - 1);
        }
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

  const addExerciseToSession = async (ex: CatalogExercise, options?: { makeCurrent?: boolean }) => {
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
        if (options?.makeCurrent) {
          const addedIndex = data.session.exercises.findIndex((exercise: any) => exercise.catalogId === ex.id);
          setCurrentExercise(addedIndex >= 0 ? addedIndex : data.session.exercises.length - 1);
          setActiveSetIdx(null);
        }
        setShowAddExercise(false);
        setExerciseSearch('');
        setSelectedMuscle(null);
      }
    } catch (err) {
      console.error('Add exercise to session error:', err);
    }
  };

  const startDay = async (option: DayOption) => {
    if (!today) return;
    setChosenDay(option);
    setChoosingDay(false);
    setToday({ ...today, dayLabel: option.dayLabel, suggestedMuscleGroups: option.muscleGroups });
    try {
      const res = await apiGet(`/training/prescription/${encodeURIComponent(option.dayLabel)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.prescription && data.prescription.exercises.length > 0) {
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

  const goBackToDayPicker = () => {
    setBuildMode(false);
    setChoosingDay(true);
    setChosenDay(null);
    setPendingExercises([]);
    setSelectedMuscle(null);
    setExerciseSearch('');
  };

  const beginWorkout = async () => {
    let activeSession = session;

    const allowStartWithoutPresetSession =
      today?.setupMethod === 'build_as_you_go' || today?.splitType === 'custom';

    if (!activeSession && !allowStartWithoutPresetSession) {
      Alert.alert('No workout found', 'Set up this day in My Program before starting it.');
      return;
    }

    // Custom split may not have a WorkoutSession until the user builds the day (same UX as build-as-you-go).
    if (
      !activeSession &&
      today?.splitType === 'custom' &&
      today.setupMethod !== 'build_as_you_go'
    ) {
      try {
        if (catalog.length === 0) {
          const catalogRes = await apiGet('/training/exercises');
          if (catalogRes.ok) {
            const catalogData = await catalogRes.json();
            setCatalog(catalogData.exercises);
          }
        }
      } catch (err) {
        console.error('Catalog fetch error:', err);
      }
      if (today.dayOptions && today.dayOptions.length > 1) {
        setChoosingDay(true);
        setChosenDay(null);
        setBuildMode(false);
      } else {
        setBuildMode(true);
        setChoosingDay(false);
      }
      setWorkoutActive(true);
      setWorkoutStartTime(Date.now());
      return;
    }

    // For template/plan sessions, apply autoregulation prescription before starting
    if (activeSession?.id && today?.setupMethod !== 'build_as_you_go') {
      try {
        const res = await apiPost(`/training/session/${activeSession.id}/apply-prescription`, {});
        if (res.ok) {
          const data = await res.json();
          activeSession = data.session;
          setSession(data.session);

          if (!data.applied) {
            const startRes = await apiPut(`/training/session/${activeSession.id}/start`, {});
            if (!startRes.ok) {
              const err = await startRes.json();
              throw new Error(err.error || 'Failed to start workout');
            }
            const startData = await startRes.json();
            activeSession = {
              ...activeSession,
              ...startData.session,
            };
            setSession((prev: any) => prev ? { ...prev, ...startData.session } : startData.session);
          }
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to start workout');
        return;
      }
    }
    setWorkoutActive(true);
    setWorkoutStartTime(Date.now());
  };

  const allSetsComplete = session?.exercises?.length > 0 &&
    session.exercises.every((e: any) => e.sets.every((s: any) => s.completed));

  const hours = Math.floor(elapsedSeconds / 3600);
  const mins = Math.floor((elapsedSeconds % 3600) / 60);
  const secs = elapsedSeconds % 60;
  const workoutDuration = hours > 0
    ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${mins}:${String(secs).padStart(2, '0')}`;

  return {
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
    chosenDay,
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
  };
}
