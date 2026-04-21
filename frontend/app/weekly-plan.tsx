import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { apiGet, apiPut } from '../src/utils/api';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { MUSCLE_LABELS } from '../src/constants/training';

interface ProgramDay {
  dayLabel: string;
  muscleGroups: string[];
  completedThisWeek: boolean;
  completedAt: string | null;
  exercises: { catalogId: string | null; exerciseName: string; muscleGroup: string; sets: number }[];
}

export default function WeeklyPlanScreen() {
  const router = useRouter();
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const res = await apiGet('/training/program/days');
          if (res.ok) {
            const data = await res.json();
            setDays(data.days || []);
          }
        } catch (err) {
          console.error('Failed to load weekly plan:', err);
        } finally {
          setLoading(false);
        }
      };

      load();
    }, [])
  );

  const moveDay = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= days.length) return;
    const updated = [...days];
    [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
    setDays(updated);
    setOrderDirty(true);
  };

  const saveDayOrder = async () => {
    setSavingOrder(true);
    try {
      const res = await apiPut('/training/program/reorder-days', {
        days: days.map((d) => ({ dayLabel: d.dayLabel, muscleGroups: d.muscleGroups })),
      });
      if (res.ok) {
        setOrderDirty(false);
        setReordering(false);
        Alert.alert('Saved', 'Day order updated');
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to save');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingOrder(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.accent_primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={20} color={COLORS.accent_primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View pointerEvents="none" style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Weekly Plan</Text>
        </View>

        <TouchableOpacity onPress={() => setReordering((value) => !value)} style={styles.headerActionButton}>
          <Text style={styles.headerActionText}>{reordering ? 'Done' : 'Reorder'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {reordering && orderDirty ? (
          <TouchableOpacity
            style={styles.saveOrderButton}
            onPress={saveDayOrder}
            disabled={savingOrder}
          >
            <Text style={styles.saveOrderText}>{savingOrder ? 'Saving...' : 'Save Order'}</Text>
          </TouchableOpacity>
        ) : null}

        {days.length > 0 ? (
          days.map((day, i) => (
            <TouchableOpacity
              key={day.dayLabel}
              style={[styles.dayCard, day.completedThisWeek && styles.dayCardCompleted]}
              onPress={reordering ? undefined : () => router.push({ pathname: '/edit-day', params: { dayLabel: day.dayLabel } })}
              activeOpacity={reordering ? 1 : 0.7}
            >
              <View style={styles.dayCardHeader}>
                {reordering ? (
                  <View style={styles.reorderControls}>
                    <TouchableOpacity onPress={() => moveDay(i, 'up')} disabled={i === 0}>
                      <Text style={[styles.reorderArrow, i === 0 && styles.reorderDisabled]}>▲</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveDay(i, 'down')} disabled={i === days.length - 1}>
                      <Text style={[styles.reorderArrow, i === days.length - 1 && styles.reorderDisabled]}>▼</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <View style={styles.dayMeta}>
                  <View style={styles.dayTitleRow}>
                    <Text style={styles.dayCardTitle}>{day.dayLabel}</Text>
                    {day.completedThisWeek ? (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>Done</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.dayCardMuscles}>
                    {day.muscleGroups.map((m) => MUSCLE_LABELS[m] || m).join(', ')}
                  </Text>
                </View>

                {!reordering ? <Text style={styles.editArrow}>›</Text> : null}
              </View>

              {!reordering && day.exercises.length > 0 ? (
                <View style={styles.exerciseList}>
                  {day.exercises.map((ex, j) => (
                    <View key={j} style={styles.exerciseRow}>
                      <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                      <Text style={styles.exerciseSets}>{ex.sets} sets</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.placeholder}>No weekly plan available.</Text>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    minHeight: 48,
  },
  headerTitleWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    color: COLORS.accent_primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerActionButton: {
    position: 'absolute',
    right: SPACING.xl,
  },
  headerActionText: {
    color: COLORS.accent_primary,
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    color: COLORS.text_primary,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  scroll: {
    padding: SPACING.xl,
    paddingTop: 0,
    paddingBottom: 100,
  },
  placeholder: {
    color: COLORS.text_secondary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  saveOrderButton: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  saveOrderText: {
    color: COLORS.text_on_accent,
    fontSize: 14,
    fontWeight: '700',
  },
  dayCard: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  dayCardCompleted: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayMeta: {
    flex: 1,
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  dayCardTitle: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '700',
  },
  completedBadge: {
    backgroundColor: COLORS.success_subtle,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  completedBadgeText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '700',
  },
  dayCardMuscles: {
    color: COLORS.text_secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  editArrow: {
    color: COLORS.text_tertiary,
    fontSize: 22,
    fontWeight: '300',
    marginLeft: SPACING.md,
  },
  reorderControls: {
    marginRight: SPACING.md,
    gap: 4,
  },
  reorderArrow: {
    color: COLORS.accent_primary,
    fontSize: 14,
    textAlign: 'center',
  },
  reorderDisabled: {
    opacity: 0.2,
  },
  exerciseList: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
    gap: 4,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    color: COLORS.text_secondary,
    fontSize: 13,
    flex: 1,
  },
  exerciseSets: {
    color: COLORS.text_tertiary,
    fontSize: 12,
  },
});
