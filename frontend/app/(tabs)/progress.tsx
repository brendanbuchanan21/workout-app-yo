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
import StrengthTab from '../../src/components/Progress/StrengthTab';
import VolumeTab from '../../src/components/Progress/VolumeTab';
import ActivityTab from '../../src/components/Progress/ActivityTab';
import WeightTab from '../../src/components/Progress/WeightTab';

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

type TabKey = 'prs' | 'strength' | 'volume' | 'activity' | 'weight';

export default function Progress() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('prs');
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
            ['prs', 'PRs'],
            ['strength', 'Strength'],
            ['volume', 'Volume'],
            ['activity', 'Activity'],
          ] as [TabKey, string][]).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, tab === key && styles.tabActive]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'prs' && <PRsTab />}
        {tab === 'strength' && (
              <StrengthTab
                onViewDetail={(catalogId, exerciseName) =>
                  router.push({ pathname: '/exercise-detail', params: { catalogId, exerciseName } })
                }
              />
            )}
        {tab === 'volume' && (
          <VolumeTab exerciseComparison={exerciseVolume} />
        )}
        {tab === 'activity' && <ActivityTab activity={activity} />}
        {tab === 'weight' && <WeightTab entries={entries} newWeight={newWeight} setNewWeight={setNewWeight} handleLogWeight={handleLogWeight} />}
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
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.bg_input,
  },
  tabText: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.text_primary,
  },
});
