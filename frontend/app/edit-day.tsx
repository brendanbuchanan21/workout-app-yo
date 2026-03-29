import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { apiGet, apiPut } from '../src/utils/api';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { MUSCLE_LABELS } from '../src/constants/training';

interface ProgramExercise {
  catalogId: string | null;
  exerciseName: string;
  muscleGroup: string;
  sets: number;
  repRangeLow: number;
  repRangeHigh: number;
}

interface CatalogExercise {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
  repRangeLow: number;
  repRangeHigh: number;
}

export default function EditDay() {
  const router = useRouter();
  const { dayLabel } = useLocalSearchParams<{ dayLabel: string }>();

  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Add exercise mode
  const [showAdd, setShowAdd] = useState(false);
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [search, setSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState<string | null>(null);

  // Swap mode
  const [swapIndex, setSwapIndex] = useState<number | null>(null);

  useEffect(() => {
    loadDay();
  }, []);

  const loadDay = async () => {
    try {
      const res = await apiGet('/training/program/days');
      if (res.ok) {
        const data = await res.json();
        const day = data.days.find((d: any) => d.dayLabel === dayLabel);
        if (day) setExercises(day.exercises);
      }
    } catch (err) {
      console.error('Load day error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    if (catalog.length > 0) return;
    try {
      const res = await apiGet('/training/exercises');
      if (res.ok) {
        const data = await res.json();
        setCatalog(data.exercises);
      }
    } catch (err) {
      console.error('Load catalog error:', err);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiPut(
        `/training/program/day/${encodeURIComponent(dayLabel!)}/exercises`,
        { exercises }
      );
      if (res.ok) {
        setDirty(false);
        Alert.alert('Saved', 'Future sessions updated');
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to save');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
    setDirty(true);
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= exercises.length) return;
    const updated = [...exercises];
    [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
    setExercises(updated);
    setDirty(true);
  };

  const addExercise = (ex: CatalogExercise) => {
    setExercises([...exercises, {
      catalogId: ex.id,
      exerciseName: ex.name,
      muscleGroup: ex.primaryMuscle,
      sets: 3,
      repRangeLow: ex.repRangeLow,
      repRangeHigh: ex.repRangeHigh,
    }]);
    setShowAdd(false);
    setSearch('');
    setFilterMuscle(null);
    setDirty(true);
  };

  const swapExercise = (ex: CatalogExercise) => {
    if (swapIndex === null) return;
    const updated = [...exercises];
    updated[swapIndex] = {
      ...updated[swapIndex],
      catalogId: ex.id,
      exerciseName: ex.name,
      muscleGroup: ex.primaryMuscle,
      repRangeLow: ex.repRangeLow,
      repRangeHigh: ex.repRangeHigh,
    };
    setExercises(updated);
    setSwapIndex(null);
    setSearch('');
    setFilterMuscle(null);
    setDirty(true);
  };

  const updateSets = (index: number, sets: number) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], sets: Math.max(1, Math.min(10, sets)) };
    setExercises(updated);
    setDirty(true);
  };

  const handleBack = () => {
    if (dirty) {
      Alert.alert('Unsaved Changes', 'You have unsaved changes. Discard them?', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  // Exercise picker (shared for add + swap)
  const isPickerOpen = showAdd || swapIndex !== null;

  const filteredCatalog = catalog.filter((ex) => {
    if (filterMuscle && ex.primaryMuscle !== filterMuscle) return false;
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const muscles = [...new Set(catalog.map((e) => e.primaryMuscle))].sort();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent_primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{dayLabel}</Text>
        <TouchableOpacity onPress={save} disabled={!dirty || saving}>
          <Text style={[styles.saveText, (!dirty || saving) && { opacity: 0.4 }]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {isPickerOpen ? (
        <ExercisePicker
          exercises={filteredCatalog}
          muscles={muscles}
          search={search}
          filterMuscle={filterMuscle}
          onSearch={setSearch}
          onFilterMuscle={setFilterMuscle}
          onSelect={swapIndex !== null ? swapExercise : addExercise}
          onCancel={() => { setShowAdd(false); setSwapIndex(null); setSearch(''); setFilterMuscle(null); }}
          title={swapIndex !== null ? `Replace ${exercises[swapIndex]?.exerciseName}` : 'Add Exercise'}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {exercises.map((ex, i) => (
            <View key={i} style={styles.exerciseCard}>
              <View style={styles.exerciseMain}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                  <Text style={styles.exerciseMuscle}>{MUSCLE_LABELS[ex.muscleGroup] || ex.muscleGroup}</Text>
                </View>
                <View style={styles.setsControl}>
                  <TouchableOpacity onPress={() => updateSets(i, ex.sets - 1)}>
                    <Text style={styles.setsBtn}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.setsValue}>{ex.sets}</Text>
                  <TouchableOpacity onPress={() => updateSets(i, ex.sets + 1)}>
                    <Text style={styles.setsBtn}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.exerciseActions}>
                <TouchableOpacity onPress={() => moveExercise(i, 'up')} disabled={i === 0}>
                  <Text style={[styles.actionText, i === 0 && styles.actionDisabled]}>Up</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveExercise(i, 'down')} disabled={i === exercises.length - 1}>
                  <Text style={[styles.actionText, i === exercises.length - 1 && styles.actionDisabled]}>Down</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setSwapIndex(i); loadCatalog(); }}>
                  <Text style={styles.actionTextAccent}>Swap</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeExercise(i)}>
                  <Text style={styles.actionTextDanger}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => { setShowAdd(true); loadCatalog(); }}
          >
            <Text style={styles.addButtonText}>+ Add Exercise</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ExercisePicker({
  exercises, muscles, search, filterMuscle,
  onSearch, onFilterMuscle, onSelect, onCancel, title,
}: {
  exercises: CatalogExercise[];
  muscles: string[];
  search: string;
  filterMuscle: string | null;
  onSearch: (t: string) => void;
  onFilterMuscle: (m: string | null) => void;
  onSelect: (ex: CatalogExercise) => void;
  onCancel: () => void;
  title: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={pickerStyles.header}>
        <Text style={pickerStyles.title}>{title}</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={pickerStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={pickerStyles.searchInput}
        placeholder="Search exercises..."
        placeholderTextColor={COLORS.text_tertiary}
        value={search}
        onChangeText={onSearch}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={pickerStyles.muscleScroll}>
        <TouchableOpacity
          style={[pickerStyles.musclePill, !filterMuscle && pickerStyles.musclePillActive]}
          onPress={() => onFilterMuscle(null)}
        >
          <Text style={[pickerStyles.musclePillText, !filterMuscle && pickerStyles.musclePillTextActive]}>All</Text>
        </TouchableOpacity>
        {muscles.map((m) => (
          <TouchableOpacity
            key={m}
            style={[pickerStyles.musclePill, filterMuscle === m && pickerStyles.musclePillActive]}
            onPress={() => onFilterMuscle(filterMuscle === m ? null : m)}
          >
            <Text style={[pickerStyles.musclePillText, filterMuscle === m && pickerStyles.musclePillTextActive]}>
              {MUSCLE_LABELS[m] || m}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={pickerStyles.list}>
        {exercises.map((ex) => (
          <TouchableOpacity key={ex.id} style={pickerStyles.exerciseRow} onPress={() => onSelect(ex)}>
            <Text style={pickerStyles.exerciseName}>{ex.name}</Text>
            <Text style={pickerStyles.exerciseMeta}>
              {MUSCLE_LABELS[ex.primaryMuscle] || ex.primaryMuscle} · {ex.equipment}
            </Text>
          </TouchableOpacity>
        ))}
        {exercises.length === 0 && (
          <Text style={pickerStyles.emptyText}>No exercises found</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg_primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
  },
  backText: { color: COLORS.accent_primary, fontSize: 16, fontWeight: '600' },
  headerTitle: { color: COLORS.text_primary, fontSize: 17, fontWeight: '700' },
  saveText: { color: COLORS.accent_primary, fontSize: 16, fontWeight: '600' },
  scroll: { padding: SPACING.xl, paddingTop: 0, paddingBottom: 100 },
  exerciseCard: {
    backgroundColor: COLORS.bg_elevated, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border_subtle,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  exerciseMain: { flexDirection: 'row', alignItems: 'center' },
  exerciseName: { color: COLORS.text_primary, fontSize: 15, fontWeight: '600' },
  exerciseMuscle: { color: COLORS.text_tertiary, fontSize: 12, marginTop: 1 },
  setsControl: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.bg_secondary, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  setsBtn: { color: COLORS.accent_primary, fontSize: 18, fontWeight: '600', paddingHorizontal: 4 },
  setsValue: { color: COLORS.text_primary, fontSize: 14, fontWeight: '600', minWidth: 30, textAlign: 'center' },
  exerciseActions: {
    flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.sm,
    paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border_subtle,
  },
  actionText: { color: COLORS.text_secondary, fontSize: 13, fontWeight: '500' },
  actionTextAccent: { color: COLORS.accent_light, fontSize: 13, fontWeight: '500' },
  actionTextDanger: { color: COLORS.danger, fontSize: 13, fontWeight: '500' },
  actionDisabled: { opacity: 0.3 },
  addButton: {
    paddingVertical: SPACING.md, alignItems: 'center',
    backgroundColor: COLORS.bg_elevated, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border_subtle, borderStyle: 'dashed',
    marginTop: SPACING.sm,
  },
  addButtonText: { color: COLORS.accent_light, fontSize: 14, fontWeight: '600' },
});

const pickerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, paddingBottom: SPACING.sm,
  },
  title: { color: COLORS.text_primary, fontSize: 16, fontWeight: '700' },
  cancelText: { color: COLORS.text_secondary, fontSize: 14 },
  searchInput: {
    marginHorizontal: SPACING.xl, backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 15,
    color: COLORS.text_primary, borderWidth: 1, borderColor: COLORS.border_subtle,
    marginBottom: SPACING.sm,
  },
  muscleScroll: { paddingHorizontal: SPACING.xl, maxHeight: 40, marginBottom: SPACING.sm },
  musclePill: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.full, marginRight: SPACING.xs, borderWidth: 1, borderColor: COLORS.border_subtle,
  },
  musclePillActive: { backgroundColor: COLORS.accent_subtle, borderColor: COLORS.accent_muted },
  musclePillText: { color: COLORS.text_secondary, fontSize: 12, fontWeight: '500' },
  musclePillTextActive: { color: COLORS.accent_light },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: 100 },
  exerciseRow: {
    paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border_subtle,
  },
  exerciseName: { color: COLORS.text_primary, fontSize: 15, fontWeight: '500' },
  exerciseMeta: { color: COLORS.text_tertiary, fontSize: 12, marginTop: 2 },
  emptyText: { color: COLORS.text_tertiary, fontSize: 14, textAlign: 'center', marginTop: SPACING.xl },
});
