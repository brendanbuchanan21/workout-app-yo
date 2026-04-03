import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../src/context/AuthContext';
import { apiGet } from '../../src/utils/api';
import { useRefreshOnFocus } from '../../src/hooks/useRefreshOnFocus';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
// NUTRITION_HIDDEN: MacroRing import removed

interface TodayContext {
  trainingBlockId: string;
  weekNumber: number;
  dayIndex: number;
  dayLabel: string;
  suggestedMuscleGroups: string[];
  targetRir: number;
  splitType: string;
  setupMethod: string | null;
}

interface ActiveTrainingBlock {
  id: string;
  splitType: string;
  setupMethod: string | null;
  currentWeek: number;
  lengthWeeks: number;
  daysPerWeek: number;
  workoutSessions: any[];
}

// NUTRITION_HIDDEN: PHASE_LABELS removed

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', quads: 'Quads', hamstrings: 'Hamstrings',
  side_delts: 'Side Delts', rear_delts: 'Rear Delts', biceps: 'Biceps',
  triceps: 'Triceps', calves: 'Calves', abs: 'Abs', glutes: 'Glutes', traps: 'Traps',
};

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

  const todayQuery = useQuery({
    queryKey: ['training', 'today'],
    queryFn: async () => {
      const res = await apiGet('/training/today');
      if (!res.ok) return null;
      return res.json();
    },
  });

  useRefreshOnFocus(() => {
    userQuery.refetch();
    blockQuery.refetch();
    todayQuery.refetch();
  });

  const loading = userQuery.isLoading || blockQuery.isLoading || todayQuery.isLoading;
  const trainingBlock: ActiveTrainingBlock | null = blockQuery.data?.trainingBlock ?? null;
  const today: TodayContext | null = todayQuery.data ?? null;

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
        const session = todaySessions[0];
        const exerciseCount = session.exercises?.length || 0;
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
      const session = todaySessions[0];
      const exerciseCount = session.exercises?.length || 0;
      return {
        title: today.dayLabel,
        subtitle: `${exerciseCount} exercises · RIR: ${today.targetRir}`,
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
  // NUTRITION_HIDDEN: phase badge now shows training week only
  const weekLabel = trainingBlock ? `WEEK ${trainingBlock.currentWeek} OF ${trainingBlock.lengthWeeks}` : '';

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
        {/* Phase badge */}
        <View style={styles.phaseBadge}>
          <View style={styles.phaseDot} />
          <Text style={styles.phaseText}>{weekLabel || 'TRAINING'}</Text>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>Hey {user?.displayName || 'there'}</Text>
        <Text style={styles.subGreeting}>
          {workoutInfo.isEmpty
            ? 'No workout scheduled'
            : workoutInfo.isBuildable
              ? 'Pick a day and build your workout'
              : `${workoutInfo.title} today`}
        </Text>
        {/* Today's workout card */}
        <TouchableOpacity style={styles.workoutCard} onPress={() => router.push('/(tabs)/train')}>
          <View style={styles.workoutCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>TODAY'S WORKOUT</Text>
              <Text style={styles.cardTitle}>{workoutInfo.title}</Text>
            </View>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>{workoutInfo.isBuildable ? '+' : '>'}</Text>
            </View>
          </View>
          <Text style={styles.workoutSubtext}>{workoutInfo.subtitle}</Text>
        </TouchableOpacity>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          {/* NUTRITION_HIDDEN: removed Log Meal and Check-in, added View PRs */}
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/progress')}>
            <Text style={styles.quickActionLabel}>View PRs</Text>
          </TouchableOpacity>
        </View>

        {/* Profile & Settings */}
        <TouchableOpacity style={styles.settingsCard} onPress={() => router.push('/settings')}>
          <Text style={styles.settingsLabel}>Profile & Settings</Text>
          <Text style={styles.settingsChevron}>&#x203A;</Text>
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
  scroll: {
    padding: SPACING.xl,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: COLORS.accent_subtle,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent_primary,
  },
  phaseText: {
    color: COLORS.accent_light,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text_primary,
    letterSpacing: -0.3,
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
  workoutCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.md,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cardTitle: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
  },
  workoutSubtext: {
    color: COLORS.text_tertiary,
    fontSize: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent_primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: COLORS.text_on_accent,
    fontSize: 18,
    fontWeight: '700',
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
});
