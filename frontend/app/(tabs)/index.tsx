import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../src/context/AuthContext';
import { apiGet } from '../../src/utils/api';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import MacroRing from '../../src/components/Home/MacroRing';

interface NutritionPhase {
  phaseType: string;
  currentCalories: number;
  currentProteinG: number;
  currentCarbsG: number;
  currentFatG: number;
}

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

const PHASE_LABELS: Record<string, string> = {
  cut: 'CUTTING',
  bulk: 'BULKING',
  maintain: 'MAINTAINING',
};

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', quads: 'Quads', hamstrings: 'Hamstrings',
  side_delts: 'Side Delts', rear_delts: 'Rear Delts', biceps: 'Biceps',
  triceps: 'Triceps', calves: 'Calves', abs: 'Abs', glutes: 'Glutes', traps: 'Traps',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [phase, setPhase] = useState<NutritionPhase | null>(null);
  const [today, setToday] = useState<TodayContext | null>(null);
  const [trainingBlock, setTrainingBlock] = useState<ActiveTrainingBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayNutrition, setTodayNutrition] = useState({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });

  const loadDashboard = async () => {
    try {
      const [userRes, blockRes, todayRes] = await Promise.all([
        apiGet('/user/me'),
        apiGet('/training/block/active'),
        apiGet('/training/today'),
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.nutritionPhase) setPhase(userData.nutritionPhase);
      }

      if (blockRes.ok) {
        const blockData = await blockRes.json();
        setTrainingBlock(blockData.trainingBlock);
      }

      if (todayRes.ok) {
        const todayData = await todayRes.json();
        setToday(todayData);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reload data when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

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
  const phaseLabel = phase ? PHASE_LABELS[phase.phaseType] || phase.phaseType.toUpperCase() : 'TRAINING';
  const weekLabel = trainingBlock ? `WEEK ${trainingBlock.currentWeek}` : '';

  const macroTargets = phase || { currentCalories: 0, currentProteinG: 0, currentCarbsG: 0, currentFatG: 0 };

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
          <Text style={styles.phaseText}>{phaseLabel}{weekLabel ? ` -- ${weekLabel}` : ''}</Text>
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

        {/* Macro rings */}
        <View style={styles.macroCard}>
          <MacroRing label="Calories" current={todayNutrition.calories} target={macroTargets.currentCalories} color={COLORS.accent_primary} />
          <MacroRing label="Protein" current={todayNutrition.proteinG} target={macroTargets.currentProteinG} color={COLORS.success} />
          <MacroRing label="Carbs" current={todayNutrition.carbsG} target={macroTargets.currentCarbsG} color={COLORS.warning} />
          <MacroRing label="Fat" current={todayNutrition.fatG} target={macroTargets.currentFatG} color="#A78BFA" />
        </View>

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
          {[
            { label: 'Log Meal', onPress: () => router.push('/(tabs)/nutrition') },
            { label: 'Log Weight', onPress: () => router.push('/(tabs)/progress') },
            { label: 'Check-in', onPress: () => {} },
          ].map((action) => (
            <TouchableOpacity key={action.label} style={styles.quickAction} onPress={action.onPress}>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings / Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
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
  logoutButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  logoutText: {
    color: COLORS.text_tertiary,
    fontSize: 13,
  },
});
