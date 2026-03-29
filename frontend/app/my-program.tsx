import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { apiGet, apiPut } from '../src/utils/api';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { SPLIT_LABELS, MUSCLE_LABELS } from '../src/constants/training';

interface ProgramDay {
  dayLabel: string;
  muscleGroups: string[];
  exercises: { catalogId: string | null; exerciseName: string; muscleGroup: string; sets: number }[];
}

interface TrainingBlock {
  id: string;
  splitType: string;
  daysPerWeek: number;
  lengthWeeks: number;
  currentWeek: number;
  setupMethod: string | null;
}

export default function MyProgram() {
  const router = useRouter();
  const [block, setBlock] = useState<TrainingBlock | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const [blockRes, daysRes] = await Promise.all([
            apiGet('/training/block/active'),
            apiGet('/training/program/days'),
          ]);
          if (blockRes.ok) {
            const data = await blockRes.json();
            setBlock(data.trainingBlock);
          }
          if (daysRes.ok) {
            const data = await daysRes.json();
            setDays(data.days);
          }
        } catch (err) {
          console.error('Failed to load program:', err);
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [])
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

  if (!block) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.emptyText}>No active program</Text>
        </View>
      </SafeAreaView>
    );
  }

  const splitLabel = SPLIT_LABELS[block.splitType] || block.splitType;

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Program</Text>
        <TouchableOpacity onPress={() => reordering ? setReordering(false) : setReordering(true)}>
          <Text style={styles.backText}>{reordering ? 'Done' : 'Reorder'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Overview card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>{splitLabel}</Text>
              <Text style={styles.overviewLabel}>Split</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>{block.daysPerWeek}</Text>
              <Text style={styles.overviewLabel}>Days/Week</Text>
            </View>
          </View>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>{block.currentWeek} of {block.lengthWeeks}</Text>
              <Text style={styles.overviewLabel}>Current Week</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>{block.setupMethod === 'template' ? 'Template' : 'Custom'}</Text>
              <Text style={styles.overviewLabel}>Setup</Text>
            </View>
          </View>
        </View>

        {/* Weekly schedule */}
        <Text style={styles.sectionTitle}>Weekly Schedule</Text>
        {reordering && orderDirty && (
          <TouchableOpacity
            style={styles.saveOrderButton}
            onPress={saveDayOrder}
            disabled={savingOrder}
          >
            <Text style={styles.saveOrderText}>{savingOrder ? 'Saving...' : 'Save Order'}</Text>
          </TouchableOpacity>
        )}
        {days.length > 0 ? (
          days.map((day, i) => (
            <TouchableOpacity
              key={day.dayLabel}
              style={styles.dayCard}
              onPress={reordering ? undefined : () => router.push({ pathname: '/edit-day', params: { dayLabel: day.dayLabel } })}
              activeOpacity={reordering ? 1 : 0.7}
            >
              <View style={styles.dayCardHeader}>
                {reordering && (
                  <View style={styles.reorderControls}>
                    <TouchableOpacity onPress={() => moveDay(i, 'up')} disabled={i === 0}>
                      <Text style={[styles.reorderArrow, i === 0 && styles.reorderDisabled]}>▲</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveDay(i, 'down')} disabled={i === days.length - 1}>
                      <Text style={[styles.reorderArrow, i === days.length - 1 && styles.reorderDisabled]}>▼</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayCardTitle}>{day.dayLabel}</Text>
                  <Text style={styles.dayCardMuscles}>
                    {day.muscleGroups.map((m) => MUSCLE_LABELS[m] || m).join(', ')}
                  </Text>
                </View>
                {!reordering && <Text style={styles.editArrow}>›</Text>}
              </View>
              {!reordering && day.exercises.length > 0 && (
                <View style={styles.exerciseList}>
                  {day.exercises.map((ex, j) => (
                    <View key={j} style={styles.exerciseRow}>
                      <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                      <Text style={styles.exerciseSets}>{ex.sets} sets</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>
            {block.setupMethod === 'build_as_you_go'
              ? 'Exercises are chosen each session'
              : 'No schedule data available'}
          </Text>
        )}

        {/* Plan Settings link */}
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/plan-settings')}
        >
          <Text style={styles.settingsButtonText}>Plan Settings</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  backText: {
    color: COLORS.accent_primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: COLORS.text_primary,
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: {
    padding: SPACING.xl,
    paddingTop: 0,
    paddingBottom: 100,
  },
  overviewCard: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  overviewItem: {
    flex: 1,
  },
  overviewValue: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  overviewLabel: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  dayCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayCardTitle: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  dayCardMuscles: {
    color: COLORS.text_secondary,
    fontSize: 13,
  },
  editArrow: {
    color: COLORS.text_tertiary,
    fontSize: 22,
    fontWeight: '300',
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
  emptyText: {
    color: COLORS.text_tertiary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  settingsButton: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  settingsButtonText: {
    color: COLORS.accent_light,
    fontSize: 14,
    fontWeight: '600',
  },
});
