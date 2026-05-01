import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../src/context/AuthContext';
import { apiGet } from '../../src/utils/api';
import { useRefreshOnFocus } from '../../src/hooks/useRefreshOnFocus';
import { COLORS, SPACING } from '../../src/constants/theme';
import RecentPRs from '../../src/components/Home/RecentPRs';
import RecommendationPanel from '../../src/components/Home/RecommendationPanel';
import { PREvent, TodayContext, TodayOverview } from '../../src/types/training';
import TodaysWorkout from '../../src/components/Home/todaysWorkout';
import WeeklySummaryCard from '../../src/components/Home/weeklySummaryCard';
// NUTRITION_HIDDEN: MacroRing import removed

interface ActiveTrainingBlock {
  id: string;
  splitType: string;
  setupMethod: string | null;
  phaseIntent: string | null;
  currentWeek: number;
  lengthWeeks: number;
  daysPerWeek: number;
  workoutSessions: any[];
}

interface WeeklyVolumeData {
  lengthWeeks: number;
  currentWeek: number;
  volumeTargets: Record<string, number>;
  data: Record<string, (number | null)[]>;
}


// NUTRITION_HIDDEN: PHASE_LABELS removed


export default function Dashboard() {
  const { user } = useAuth();
  // NUTRITION_HIDDEN: todayNutrition state removed

  const userQuery = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const res = await apiGet('/user/me');
      if (!res.ok) return null;
      return res.json();
    },
  });

  const blockQuery = useQuery({
    queryKey: ['training', 'block', 'active'],
    queryFn: async () => {
      const res = await apiGet('/training/block/active');
      if (!res.ok) return null;
      return res.json();
    },
  });

  const todayQuery = useQuery<TodayContext | null>({
    queryKey: ['training', 'today'],
    queryFn: async () => {
      const res = await apiGet('/training/today');
      if (!res.ok) return null;
      return (await res.json()) as TodayContext;
    },
  });

  const todayOverviewQuery = useQuery<TodayOverview | null>({
    queryKey: ['training', 'today', 'overview'],
    queryFn: async () => {
      const res = await apiGet('/training/today/overview');
      if (!res.ok) return null;
      return (await res.json()) as TodayOverview;
    },
  });

  const weeklyVolumeQuery = useQuery<WeeklyVolumeData | null>({
    queryKey: ['training', 'block-weekly-volume'],
    queryFn: async () => {
      const res = await apiGet('/training/block-weekly-volume');
      if (!res.ok) return null;
      return (await res.json()) as WeeklyVolumeData;
    },
  });

  const prFeedQuery = useQuery({
    queryKey: ['training', 'prs', 'feed'],
    queryFn: async () => {
      const res = await apiGet('/training/prs/feed');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.prEvents || []) as PREvent[];
    },
  });

  const recsQuery = useQuery({
    queryKey: ['training', 'recommendations'],
    queryFn: async () => {
      const res = await apiGet('/training/recommendations');
      if (!res.ok) return [];
      const data = await res.json();
      return data.recommendations || [];
    },
  });

  useRefreshOnFocus(() => {
    userQuery.refetch();
    blockQuery.refetch();
    todayQuery.refetch();
    todayOverviewQuery.refetch();
    weeklyVolumeQuery.refetch();
    prFeedQuery.refetch();
    recsQuery.refetch();
  });

  const loading =
    userQuery.isLoading ||
    blockQuery.isLoading ||
    todayQuery.isLoading ||
    todayOverviewQuery.isLoading;
  const trainingBlock: ActiveTrainingBlock | null = blockQuery.data?.trainingBlock ?? null;
  const today: TodayContext | null = todayQuery.data ?? null;
  const recentPRs: PREvent[] = prFeedQuery.data ?? [];
  const recommendations = recsQuery.data ?? [];
  const todayOverview: TodayOverview | null = todayOverviewQuery.data ?? null;
  const weeklyVolume: WeeklyVolumeData | null = weeklyVolumeQuery.data ?? null;

  // Determine workout card content
  const getWorkoutInfo = () => {
    if (!today || !trainingBlock) {
      return { title: 'No active plan', subtitle: 'Set up your training to get started', isEmpty: true };
    }

    const setupMethod = trainingBlock.setupMethod || today.setupMethod;

    // Count today's sessions
    const todaySessions = trainingBlock.workoutSessions?.filter(
      (s: any) => s.weekNumber === today.weekNumber && s.dayLabel === today.dayLabel
    ) || [];
    const hasPlannedSession = todaySessions.length > 0;

    if (setupMethod === 'build_as_you_go') {
      if (hasPlannedSession) {
        const exerciseCount = todayOverview?.exercises.length || todaySessions[0]?.exercises?.length || 0;
        return {
          title: today.dayLabel,
          subtitle: `${exerciseCount} exercises · RIR: ${today.targetRir}`,
          isEmpty: false,
        };
      }
      return {
        title: 'Choose Your Workout',
        subtitle: `${trainingBlock.daysPerWeek - (today as any).dayIndex} sessions left this week`,
        isEmpty: false,
        isBuildable: true,
      };
    }

    // Template or plan setup
    if (hasPlannedSession) {
      const sets = todayOverview?.totalWorkoutSets
        ?? todaySessions[0]?.exercises?.reduce((acc: number, e: any) => acc + (e.sets?.length ?? 0), 0)
        ?? 0;
      return {
        title: today.dayLabel,
        subtitle: `Total Sets: ${sets} · RIR: ${today.targetRir}`,
        isEmpty: false,
      };
    }

    return {
      title: today.dayLabel,
      subtitle: `RIR: ${today.targetRir}`,
      isEmpty: false,
    };
  };

  const workoutInfo = getWorkoutInfo();
  const phaseLabel = trainingBlock?.phaseIntent
    ? trainingBlock.phaseIntent.toUpperCase()
    : null;
  const weekLabel = trainingBlock
    ? `WEEK ${trainingBlock.currentWeek} OF ${trainingBlock.lengthWeeks}${phaseLabel ? ` · ${phaseLabel}` : ''}`
    : '';
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
        <View style={styles.topRow}>
          <Text style={styles.greeting}>Hey {user?.displayName || 'there'}</Text>
          <View style={styles.phaseBadge}>
            <View style={styles.phaseDot} />
            <Text style={styles.phaseText}>{weekLabel || 'TRAINING'}</Text>
          </View>
        </View>
        {/* Today's workout card */}
        <TodaysWorkout workoutInfo={workoutInfo} todayOverview={todayOverview} todayContext={today} />
        <WeeklySummaryCard weeklyVolume={weeklyVolume} />
        

        {/* Recommendations */}
        {trainingBlock && <RecommendationPanel recommendations={recommendations} />}

        {/* Recent PRs */}
        <RecentPRs events={recentPRs} />
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
    padding: SPACING.lg,
    paddingBottom: 110,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 11,
    backgroundColor: 'rgba(232, 145, 45, 0.10)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(232, 145, 45, 0.42)',
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent_primary,
  },
  phaseText: {
    color: COLORS.gold_primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  greeting: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text_primary,
    letterSpacing: -0.7,
  },
});
