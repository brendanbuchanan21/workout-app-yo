import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { apiGet } from '../src/utils/api';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { SPLIT_LABELS } from '../src/constants/training';
import WeekTimeline from '../src/components/MyProgram/WeekTimeline';
import WeeklyVolumeBreakdown from '../src/components/MyProgram/WeeklyVolumeBreakdown';
import PastWorkoutsList, { PastWorkout } from '../src/components/MyProgram/PastWorkoutsList';

interface ProgramDay {
  dayLabel: string;
  muscleGroups: string[];
  completedThisWeek: boolean;
  completedAt: string | null;
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

interface WeeklyVolumeData {
  lengthWeeks: number;
  currentWeek: number;
  volumeTargets: Record<string, number>;
  data: Record<string, (number | null)[]>;
}

export default function MyProgram() {
  const router = useRouter();
  const [block, setBlock] = useState<TrainingBlock | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolumeData | null>(null);
  const [pastWorkouts, setPastWorkouts] = useState<PastWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const [blockRes, daysRes, volumeRes, sessionsRes] = await Promise.all([
            apiGet('/training/block/active'),
            apiGet('/training/program/days'),
            apiGet('/training/block-weekly-volume'),
            apiGet('/training/block/sessions'),
          ]);
          if (blockRes.ok) {
            const data = await blockRes.json();
            setBlock(data.trainingBlock);
          }
          if (daysRes.ok) {
            const data = await daysRes.json();
            setDays(data.days);
            if (data.currentWeek) setCurrentWeek(data.currentWeek);
          }
          if (volumeRes.ok) {
            const data = await volumeRes.json();
            setWeeklyVolume(data);
          }
          if (sessionsRes.ok) {
            const data = await sessionsRes.json();
            setPastWorkouts(data.sessions);
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
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.accent_primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!block) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={20} color={COLORS.accent_primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View pointerEvents="none" style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>My Program</Text>
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>No active program</Text>
        </View>
      </SafeAreaView>
    );
  }

  const splitLabel = SPLIT_LABELS[block.splitType] || block.splitType;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View pointerEvents="none" style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>My Program</Text>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={20} color={COLORS.accent_primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/plan-settings')} style={styles.headerActionButton}>
          <Text style={styles.headerEditText}>Edit</Text>
          <Ionicons name="create-outline" size={18} color={COLORS.accent_primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
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

          <View style={styles.overviewDivider} />
          <TouchableOpacity
            onPress={() => router.push('/weekly-plan')}
            style={styles.weeklyPlanButton}
          >
            <Text style={styles.weeklyPlanText}>View Weekly Plan</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.accent_primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Week {currentWeek} Progress</Text>
        <View style={styles.timelineCard}>
          <WeekTimeline
            days={days.map((d) => ({
              dayLabel: d.dayLabel,
              completed: d.completedThisWeek,
            }))}
          />
        </View>

        {weeklyVolume && (
          <WeeklyVolumeBreakdown
            lengthWeeks={weeklyVolume.lengthWeeks}
            currentWeek={weeklyVolume.currentWeek}
            volumeTargets={weeklyVolume.volumeTargets}
            data={weeklyVolume.data}
          />
        )}

        <Text style={styles.sectionTitle}>Past Workouts</Text>
        <PastWorkoutsList workouts={pastWorkouts} />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    minHeight: 48,
  },
  headerTitleWrap: {
    ...StyleSheet.absoluteFillObject,
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
  headerActionButton: {
    position: 'absolute',
    right: SPACING.xl,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  headerEditText: {
    color: COLORS.accent_primary,
    fontSize: 16,
    fontWeight: '600',
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
    textAlign: 'center',
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
  },
  overviewRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
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
  overviewDivider: {
    height: 1,
    backgroundColor: COLORS.border_subtle,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  weeklyPlanButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xs,
  },
  weeklyPlanText: {
    color: COLORS.accent_light,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  timelineCard: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  emptyText: {
    color: COLORS.text_tertiary,
    fontSize: 14,
    textAlign: 'center',
  },
});
