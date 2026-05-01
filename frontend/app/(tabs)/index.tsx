import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Polyline, Stop } from 'react-native-svg';
import { useAuth } from '../../src/context/AuthContext';
import { apiGet } from '../../src/utils/api';
import { useRefreshOnFocus } from '../../src/hooks/useRefreshOnFocus';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import RecentPRs from '../../src/components/Home/RecentPRs';
import RecommendationPanel from '../../src/components/Home/RecommendationPanel';
import { PREvent, TodayContext, TodayOverview } from '../../src/types/training';
import TodaysWorkout from '../../src/components/Home/todaysWorkout';
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

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', quads: 'Quads', hamstrings: 'Hamstrings',
  side_delts: 'Side Delts', rear_delts: 'Rear Delts', biceps: 'Biceps',
  triceps: 'Triceps', calves: 'Calves', abs: 'Abs', glutes: 'Glutes', traps: 'Traps',
};

function buildSparklinePoints(values: number[], width = 130, height = 44) {
  const safeValues = values.length > 0 ? values : [0, 0, 0, 0];
  const maxValue = Math.max(...safeValues, 1);
  const minValue = Math.min(...safeValues, 0);
  const range = Math.max(maxValue - minValue, 1);

  return safeValues.map((value, index) => {
    const x = 6 + (index / Math.max(safeValues.length - 1, 1)) * (width - 10);
    const y = 8 + (1 - (value - minValue) / range) * (height - 16);
    return `${Math.round(x)},${Math.round(y)}`;
  }).join(' ');
}

function getWeeklyVolumeStats(weeklyVolume: WeeklyVolumeData | null) {
  if (!weeklyVolume) {
    return {
      targetSets: 0,
      completedSets: 0,
      remainingSets: 0,
      trend: [0, 0, 0, 0],
    };
  }

  const currentWeekIndex = Math.max(0, weeklyVolume.currentWeek - 1);
  const targetSets = Object.values(weeklyVolume.volumeTargets || {})
    .reduce((sum, sets) => sum + sets, 0);
  const completedSets = Object.values(weeklyVolume.data || {})
    .reduce((sum, weeklySets) => sum + (weeklySets[currentWeekIndex] || 0), 0);

  const startWeek = Math.max(0, currentWeekIndex - 3);
  const trend = Array.from({ length: currentWeekIndex - startWeek + 1 }, (_, offset) => {
    const weekIndex = startWeek + offset;
    return Object.values(weeklyVolume.data || {})
      .reduce((sum, weeklySets) => sum + (weeklySets[weekIndex] || 0), 0);
  });

  return {
    targetSets,
    completedSets,
    remainingSets: Math.max(targetSets - completedSets, 0),
    trend,
  };
}

function WeeklySummaryCard({ weeklyVolume }: { weeklyVolume: WeeklyVolumeData | null }) {
  const { targetSets, completedSets, remainingSets, trend } = getWeeklyVolumeStats(weeklyVolume);
  const pct = targetSets > 0 ? Math.min(completedSets / targetSets, 1) : 0.18;
  const endAngle = Math.PI + Math.PI * Math.max(pct, 0.18);
  const center = { x: 70, y: 76 };
  const radius = 52;
  const arcStart = { x: center.x - radius, y: center.y };
  const arcEnd = {
    x: center.x + Math.cos(endAngle) * radius,
    y: center.y + Math.sin(endAngle) * radius,
  };
  const arcPath = `M ${center.x - radius} ${center.y} A ${radius} ${radius} 0 0 1 ${center.x + radius} ${center.y}`;
  const progressPath = `M ${arcStart.x} ${arcStart.y} A ${radius} ${radius} 0 0 1 ${arcEnd.x} ${arcEnd.y}`;
  const sparkPoints = buildSparklinePoints(trend);
  const sparkFillPoints = `${sparkPoints} 126,44 6,44`;
  const statusText = targetSets === 0
    ? 'Set a weekly target'
    : completedSets >= targetSets
      ? completedSets > targetSets
        ? `${completedSets - targetSets} sets above target`
        : 'Target hit'
      : `${remainingSets} sets remaining`;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.gaugeWrap}>
        <Svg width={138} height={84}>
          <Path d={arcPath} stroke={COLORS.bg_input} strokeWidth={14} fill="none" strokeLinecap="butt" />
          <Path d={progressPath} stroke={COLORS.accent_primary} strokeWidth={14} fill="none" strokeLinecap="butt" />
        </Svg>
        <Text style={styles.gaugeValue}>{completedSets}</Text>
        <Text style={styles.gaugeLabel}>Weekly Sets</Text>
        <Text style={styles.gaugeSubLabel}>{targetSets > 0 ? `${targetSets} set target` : 'No target yet'}</Text>
      </View>
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryTitle}>Weekly Volume</Text>
        <Text style={styles.summaryText}>{statusText}</Text>
        <Svg width={130} height={44} style={styles.sparkline}>
          <Defs>
            <LinearGradient id="sparkGlow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={COLORS.gold_primary} stopOpacity="0.22" />
              <Stop offset="0.58" stopColor={COLORS.accent_primary} stopOpacity="0.08" />
              <Stop offset="1" stopColor={COLORS.accent_primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Polygon
            points={sparkFillPoints}
            fill="url(#sparkGlow)"
          />
          <Polyline
            points={sparkPoints}
            fill="none"
            stroke={COLORS.gold_primary}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {(() => {
            const points = sparkPoints.split(' ');
            const lastPoint = points[points.length - 1]?.split(',').map(Number) ?? [126, 8];
            return <Circle cx={lastPoint[0]} cy={lastPoint[1]} r={3.5} fill={COLORS.gold_primary} />;
          })()}
        </Svg>
        <Text style={styles.sparklineLabel}>Past {trend.length} weeks</Text>
      </View>
    </View>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
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
  subGreeting: {
    fontSize: 13,
    color: COLORS.text_secondary,
    marginTop: 4,
    marginBottom: SPACING.xl,
  },
  macroCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 18,
    paddingHorizontal: 8,
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.lg,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  quickAction: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  quickActionLabel: {
    color: COLORS.text_secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  settingsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  settingsLabel: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  settingsChevron: {
    color: COLORS.text_tertiary,
    fontSize: 20,
    fontWeight: '600',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: 0,
    overflow: 'hidden',
  },
  gaugeWrap: {
    width: 138,
    height: 100,
    justifyContent: 'flex-end',
  },
  gaugeValue: {
    position: 'absolute',
    left: 42,
    top: 40,
    color: COLORS.gold_primary,
    fontSize: 20,
    fontWeight: '900',
  },
  gaugeLabel: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '900',
    marginTop: -8,
  },
  gaugeSubLabel: {
    color: COLORS.text_secondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 19,
  },
  summaryText: {
    color: COLORS.text_secondary,
    fontSize: 12,
    lineHeight: 15,
    marginTop: 2,
  },
  sparkline: {
    marginTop: SPACING.sm,
    marginLeft: -4,
  },
  sparklineLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: -2,
  },
});
