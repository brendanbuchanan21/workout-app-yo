import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { apiGet, apiPost } from '../../src/utils/api';
import { useRefreshOnFocus } from '../../src/hooks/useRefreshOnFocus';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import PRsTab from '../../src/components/Progress/PRsTab';
import ExercisesTab from '../../src/components/Progress/ExercisesTab';
import VolumeTab from '../../src/components/Progress/VolumeTab';
import ActivityTab from '../../src/components/Progress/ActivityTab';
import WeightTab from '../../src/components/Progress/WeightTab';
import SummaryTab from '../../src/components/Progress/SummaryTab';
import MuscleGroupsTab from '../../src/components/Progress/MuscleGroupsTab';

interface WeightEntry {
  date: string;
  weight: number;
}

interface ActivityDay {
  count: number;
  labels: string[];
}

interface VolumeData {
  sets: number;
  tonnageKg: number;
}

interface ExerciseComparison {
  exerciseName: string;
  catalogId: string | null;
  muscleGroup: string;
  current: VolumeData | null;
  previous: VolumeData | null;
}

interface MuscleGroupComparison {
  muscle: string;
  current: VolumeData | null;
  previous: VolumeData | null;
}

type TabKey = 'summary' | 'muscleGroups' | 'exercises' | 'records' | 'volume' | 'activity' | 'weight';

export default function Progress() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('summary');
  const [newWeight, setNewWeight] = useState('');

  const weightQuery = useQuery({
    queryKey: ['weight'],
    queryFn: async () => {
      const res = await apiGet('/weight');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.entries?.map((e: any) => ({
        date: e.date.split('T')[0],
        weight: Math.round(e.weightKg * 2.20462 * 10) / 10,
      })) || []) as WeightEntry[];
    },
  });

  const exerciseVolumeQuery = useQuery({
    queryKey: ['training', 'exercise-volume-comparison'],
    queryFn: async () => {
      const res = await apiGet('/training/exercise-volume-comparison');
      if (!res.ok) return { currentWeek: 1, exercises: [], muscleGroups: [] };
      const data = await res.json();
      return {
        currentWeek: data.currentWeek as number,
        exercises: (data.exercises || []) as ExerciseComparison[],
        muscleGroups: (data.muscleGroups || []) as MuscleGroupComparison[],
      };
    },
  });

  const activityQuery = useQuery({
    queryKey: ['training', 'activity'],
    queryFn: async () => {
      const res = await apiGet('/training/activity');
      if (!res.ok) return {};
      const data = await res.json();
      return (data.activity || {}) as Record<string, ActivityDay>;
    },
  });

  useRefreshOnFocus(() => {
    weightQuery.refetch();
    exerciseVolumeQuery.refetch();
    activityQuery.refetch();
  });

  const loading = weightQuery.isLoading
    || exerciseVolumeQuery.isLoading || activityQuery.isLoading;

  const entries = weightQuery.data ?? [];
  const activity = activityQuery.data ?? {};
  const exerciseVolume = exerciseVolumeQuery.data ?? { currentWeek: 1, exercises: [], muscleGroups: [] };

  const handleLogWeight = async () => {
    const w = parseFloat(newWeight);
    if (isNaN(w) || w <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }
    try {
      const weightKg = w / 2.20462;
      const today = new Date().toISOString().split('T')[0];
      const res = await apiPost('/weight', { date: today, weightKg });
      if (res.ok) {
        setNewWeight('');
        queryClient.invalidateQueries({ queryKey: ['weight'] });
      }
    } catch (err) {
      console.error('Log weight error:', err);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.screenTitle}>Progress</Text>

        <View style={styles.tabRow}>
          {([
            ['summary', 'Summary'],
            ['exercises', 'Exercises'],
            ['muscleGroups', 'Muscles'],
            ['records', 'Records'],
          ] as [TabKey, string][]).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, tab === key && styles.tabActive]}
              onPress={() => setTab(key)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.tabText, tab === key && styles.tabTextActive]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'summary' && (
          <SummaryTab
            onViewDetail={(catalogId, exerciseName) =>
              router.push({ pathname: '/exercise-detail', params: { catalogId, exerciseName } })
            }
          />
        )}
        {tab === 'muscleGroups' && (
          <MuscleGroupsTab muscleGroups={exerciseVolume.muscleGroups} />
        )}
        {tab === 'records' && <PRsTab />}
        {tab === 'exercises' && (
              <ExercisesTab
                onViewDetail={(catalogId, exerciseName) =>
                  router.push({ pathname: '/exercise-detail', params: { catalogId, exerciseName } })
                }
              />
            )}
        {tab === 'volume' && (
          <VolumeTab exerciseComparison={exerciseVolume} initialMuscle={null} />
        )}
        {tab === 'activity' && <ActivityTab activity={activity} />}
        {tab === 'weight' && (
          <WeightTab
            entries={entries}
            newWeight={newWeight}
            setNewWeight={setNewWeight}
            handleLogWeight={handleLogWeight}
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
    padding: SPACING.xl,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text_primary,
    marginBottom: SPACING.lg,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  tab: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 40,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabActive: {
    backgroundColor: COLORS.bg_input,
  },
  tabText: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
  tabTextActive: {
    color: COLORS.text_primary,
  },
});
