import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';

import { COLORS, RADIUS, SPACING } from '../src/constants/theme';
import { MUSCLE_LABELS } from '../src/constants/training';
import { apiGet, apiPut } from '../src/utils/api';
import { CardGradientSurface } from '../src/components/shared/CardGradientSurface';

interface SessionExercise {
  id: string;
  catalogId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: { id: string; completed: boolean }[];
}

export default function ChangeWorkoutOrderScreen() {
  const router = useRouter();
  const { sessionId, currentExerciseId } = useLocalSearchParams<{
    sessionId: string;
    currentExerciseId: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nowExercise, setNowExercise] = useState<SessionExercise | null>(null);
  const [upcomingExercises, setUpcomingExercises] = useState<SessionExercise[]>([]);
  const [dirty, setDirty] = useState(false);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await apiGet(`/training/session/${sessionId}`);
      if (!res.ok) {
        Alert.alert('Could not load workout', 'Try again from the active workout screen.');
        router.back();
        return;
      }

      const data = await res.json();
      const exercises = (data.session?.exercises || []) as SessionExercise[];
      const current = exercises.find((exercise) => exercise.id === currentExerciseId) || exercises[0] || null;
      setNowExercise(current);
      setUpcomingExercises(exercises.filter((exercise) => exercise.id !== current?.id));
      setDirty(false);
    } catch (error) {
      console.error('Load workout order error:', error);
      Alert.alert('Could not load workout', 'Try again from the active workout screen.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [currentExerciseId, router, sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const saveOrder = async () => {
    if (!sessionId || !nowExercise) return;
    if (!dirty) {
      router.back();
      return;
    }

    setSaving(true);
    try {
      const exerciseIds = [nowExercise.id, ...upcomingExercises.map((exercise) => exercise.id)];
      const res = await apiPut(`/training/session/${sessionId}/exercises/reorder`, { exerciseIds });
      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Order not saved', err.error || 'Could not update the exercise order.');
        return;
      }
      router.back();
    } catch (error) {
      console.error('Save workout order error:', error);
      Alert.alert('Order not saved', 'Could not update the exercise order.');
    } finally {
      setSaving(false);
    }
  };

  const renderUpcoming = ({ item, drag, isActive }: RenderItemParams<SessionExercise>) => {
    const completedSets = item.sets.filter((set) => set.completed).length;
    return (
      <TouchableOpacity
        activeOpacity={0.86}
        onLongPress={drag}
        delayLongPress={110}
        disabled={isActive}
      >
        <CardGradientSurface
          gradientId={`orderExercise-${item.id}`}
          style={[styles.exerciseCard, isActive && styles.exerciseCardActive]}
        >
          <View style={styles.exerciseRow}>
            <Text style={styles.dragHandle}>|||</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.exerciseName}>{item.exerciseName}</Text>
              <Text style={styles.exerciseMeta}>
                {MUSCLE_LABELS[item.muscleGroup] || item.muscleGroup} · {completedSets}/{item.sets.length} sets
              </Text>
            </View>
          </View>
        </CardGradientSurface>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent_primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <DraggableFlatList
        data={upcomingExercises}
        keyExtractor={(item) => item.id}
        renderItem={renderUpcoming}
        onDragEnd={({ data }) => {
          setUpcomingExercises(data);
          setDirty(true);
        }}
        activationDistance={6}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} disabled={saving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Change Order</Text>
              <TouchableOpacity onPress={saveOrder} disabled={saving}>
                <Text style={[styles.doneText, saving && styles.disabledText]}>
                  {saving ? 'Saving' : 'Done'}
                </Text>
              </TouchableOpacity>
            </View>

            {nowExercise && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Now</Text>
                <CardGradientSurface gradientId={`orderNow-${nowExercise.id}`} style={styles.nowCard}>
                  <Text style={styles.nowName}>{nowExercise.exerciseName}</Text>
                  <Text style={styles.nowMeta}>
                    {MUSCLE_LABELS[nowExercise.muscleGroup] || nowExercise.muscleGroup}
                  </Text>
                </CardGradientSurface>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Up next</Text>
              {upcomingExercises.length > 1 && (
                <Text style={styles.hintText}>Hold and drag</Text>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No upcoming exercises to reorder.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg_primary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 110,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  headerTitle: {
    color: COLORS.text_primary,
    fontSize: 17,
    fontWeight: '700',
  },
  cancelText: {
    color: COLORS.text_secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  doneText: {
    color: COLORS.accent_light,
    fontSize: 15,
    fontWeight: '700',
  },
  disabledText: {
    color: COLORS.text_tertiary,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  hintText: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  nowCard: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  nowName: {
    color: COLORS.text_primary,
    fontSize: 18,
    fontWeight: '700',
  },
  nowMeta: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  exerciseCard: {
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  exerciseCardActive: {
    opacity: 0.94,
    borderColor: COLORS.accent_muted,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  dragHandle: {
    color: COLORS.text_tertiary,
    fontSize: 20,
    fontWeight: '700',
  },
  exerciseName: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '700',
  },
  exerciseMeta: {
    color: COLORS.text_secondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  emptyText: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
