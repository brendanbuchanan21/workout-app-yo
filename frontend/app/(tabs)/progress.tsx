import { useMemo, useState } from 'react';
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
import InsightsTab from '../../src/components/Progress/InsightsTab';

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

interface DevelopmentSignal {
  muscle: string;
  state: 'developing' | 'holding' | 'mixed' | 'low_signal';
  confidence: 'high' | 'medium' | 'low';
  summary: string;
}

type TabKey = 'insights' | 'prs' | 'strength' | 'volume' | 'activity' | 'weight';

const TAB_OPTIONS: [TabKey, string][] = [
  ['insights', 'Insights'],
  ['prs', 'PRs'],
  ['strength', 'Strength'],
  ['volume', 'Volume'],
  ['activity', 'Activity'],
  ['weight', 'Weight'],
];

const STATE_META = {
  progressing: {
    title: 'Progressing',
    tone: 'Clear forward signal is showing up.',
    color: COLORS.success,
  },
  holding: {
    title: 'Holding',
    tone: 'Recent training looks steady more than upward.',
    color: COLORS.accent_light,
  },
  mixed: {
    title: 'Mixed',
    tone: 'Some forward movement is showing up, but the overall signal is not clean yet.',
    color: COLORS.warning,
  },
  low_signal: {
    title: 'Too early to tell',
    tone: 'There is not enough recent evidence for a confident read yet.',
    color: COLORS.text_secondary,
  },
} as const;

function getHeroState(signals: DevelopmentSignal[]) {
  const developing = signals.filter((signal) => signal.state === 'developing').length;
  const holding = signals.filter((signal) => signal.state === 'holding').length;
  const mixed = signals.filter((signal) => signal.state === 'mixed').length;
  const lowSignal = signals.filter((signal) => signal.state === 'low_signal').length;
  const strongDeveloping = signals.filter((signal) => signal.state === 'developing' && signal.confidence !== 'low').length;

  if (signals.length === 0 || lowSignal === signals.length) {
    return { key: 'low_signal' as const, developing, holding, mixed, lowSignal };
  }

  if (strongDeveloping >= 2 && mixed <= developing) {
    return { key: 'progressing' as const, developing, holding, mixed, lowSignal };
  }

  if (mixed > 0 || (developing > 0 && holding > 0)) {
    return { key: 'mixed' as const, developing, holding, mixed, lowSignal };
  }

  if (holding > 0 && developing === 0) {
    return { key: 'holding' as const, developing, holding, mixed, lowSignal };
  }

  return { key: 'progressing' as const, developing, holding, mixed, lowSignal };
}

export default function Progress() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('insights');
  const [volumeInitialMuscle, setVolumeInitialMuscle] = useState<string | null>(null);
  const [newWeight, setNewWeight] = useState('');

  const jumpToMuscleVolume = (muscle: string) => {
    setVolumeInitialMuscle(muscle);
    setTab('volume');
  };

  const developmentQuery = useQuery({
    queryKey: ['training', 'muscle-development-signals'],
    queryFn: async () => {
      const res = await apiGet('/training/muscle-development-signals');
      if (!res.ok) return { range: '8w', signals: [] as DevelopmentSignal[] };
      return res.json() as Promise<{ range: string; signals: DevelopmentSignal[] }>;
    },
  });

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
    developmentQuery.refetch();
    weightQuery.refetch();
    exerciseVolumeQuery.refetch();
    activityQuery.refetch();
  });

  const loading = developmentQuery.isLoading
    || weightQuery.isLoading
    || exerciseVolumeQuery.isLoading
    || activityQuery.isLoading;

  const entries = weightQuery.data ?? [];
  const activity = activityQuery.data ?? {};
  const exerciseVolume = exerciseVolumeQuery.data ?? { currentWeek: 1, exercises: [], muscleGroups: [] };
  const developmentSignals = developmentQuery.data?.signals ?? [];

  const hero = useMemo(() => getHeroState(developmentSignals), [developmentSignals]);
  const heroMeta = STATE_META[hero.key];
  const strongestSignal = developmentSignals.find((signal) => signal.state === 'developing')
    ?? developmentSignals.find((signal) => signal.state === 'holding')
    ?? developmentSignals.find((signal) => signal.state === 'mixed')
    ?? null;
  const weakestSignal = developmentSignals.find((signal) => signal.state === 'mixed')
    ?? developmentSignals.find((signal) => signal.state === 'low_signal')
    ?? null;

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
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.accent_primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.screenTitle}>Progress</Text>
        <Text style={styles.screenSubtitle}>
          A clear read on how your training is changing.
        </Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Progress Read</Text>
          <Text style={styles.heroTitle}>{heroMeta.title}</Text>
          <Text style={styles.heroBody}>{heroMeta.tone}</Text>

          <View style={styles.heroCueList}>
            <View style={styles.heroCueRow}>
              <Text style={styles.heroCueLabel}>Strongest signal</Text>
              <Text style={styles.heroCueValue}>
                {strongestSignal ? strongestSignal.muscle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'None yet'}
              </Text>
            </View>
            <View style={styles.heroCueRow}>
              <Text style={styles.heroCueLabel}>Needs more clarity</Text>
              <Text style={styles.heroCueValue}>
                {weakestSignal ? weakestSignal.muscle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'None yet'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lens</Text>
          <Text style={styles.sectionCaption}>Choose a view without losing the broader read.</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {TAB_OPTIONS.map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, tab === key && styles.tabActive]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {tab === 'insights' && <InsightsTab onJumpToMuscleVolume={jumpToMuscleVolume} />}
        {tab === 'prs' && <PRsTab />}
        {tab === 'strength' && (
          <StrengthTab
            onViewDetail={(catalogId, exerciseName) =>
              router.push({ pathname: '/exercise-detail', params: { catalogId, exerciseName } })
            }
          />
        )}
        {tab === 'volume' && (
          <VolumeTab exerciseComparison={exerciseVolume} initialMuscle={volumeInitialMuscle} />
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: SPACING.xl,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text_primary,
  },
  screenSubtitle: {
    color: COLORS.text_secondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  heroCard: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  heroEyebrow: {
    color: COLORS.accent_primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  heroTitle: {
    color: COLORS.text_primary,
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 40,
    marginBottom: SPACING.sm,
  },
  heroBody: {
    color: COLORS.text_secondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  heroCueList: {
    gap: SPACING.sm,
  },
  heroCueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  heroCueLabel: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  heroCueValue: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  sectionCaption: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    lineHeight: 18,
  },
  tabRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    backgroundColor: COLORS.bg_elevated,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  tabActive: {
    backgroundColor: COLORS.bg_input,
    borderColor: COLORS.accent_primary,
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
