import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { COLORS, SPACING, RADIUS } from '../src/constants/theme';

interface PR {
  exerciseName: string;
  weightKg: number;
  reps: number;
  previousBestReps: number | null;
}

interface ExerciseBest {
  exerciseName: string;
  weight: number;
  reps: number | null;
}

interface SessionTonnage {
  date: string;
  tonnage: number;
}

interface WorkoutSummary {
  totalSets: number;
  volumeByMuscle: Record<string, number>;
  tonnage: number;
  durationSeconds: number;
  completionRate: number;
  prs: PR[];
  perExerciseBest: ExerciseBest[];
  mesoComparison: {
    sessionTonnages: SessionTonnage[];
    totalMesoSets: number;
    sessionsCompleted: number;
  };
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function formatWeight(kg: number, unit: string): string {
  if (unit === 'imperial') {
    return `${Math.round(kg * 2.20462)} lbs`;
  }
  return `${Math.round(kg)} kg`;
}

function formatTonnage(kg: number, unit: string): string {
  if (unit === 'imperial') {
    const lbs = kg * 2.20462;
    if (lbs >= 1000) return `${(lbs / 1000).toFixed(1)}k lbs`;
    return `${Math.round(lbs)} lbs`;
  }
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}

export default function WorkoutSummary() {
  const router = useRouter();
  const params = useLocalSearchParams<{ summary: string; dayLabel: string; weekNumber: string }>();
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const unit = 'imperial'; // TODO: pull from user profile

  useEffect(() => {
    if (params.summary) {
      try {
        setSummary(JSON.parse(params.summary));
      } catch {
        console.error('Failed to parse workout summary');
      }
    }
  }, [params.summary]);

  if (!summary) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent_primary} />
        </View>
      </SafeAreaView>
    );
  }

  const hasPRs = summary.prs.length > 0;
  const tonnageHistory = summary.mesoComparison.sessionTonnages;
  const maxTonnage = Math.max(...tonnageHistory.map((t) => t.tonnage), 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <Text style={styles.title}>Workout Complete</Text>
        <Text style={styles.subtitle}>
          {params.dayLabel || 'Session'} · Week {params.weekNumber || '?'}
        </Text>

        {/* Top Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatDuration(summary.durationSeconds)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{summary.totalSets}</Text>
            <Text style={styles.statLabel}>Sets</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatTonnage(summary.tonnage, unit)}</Text>
            <Text style={styles.statLabel}>Volume</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.round(summary.completionRate * 100)}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>

        {/* PRs Section */}
        {hasPRs && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Rep PRs</Text>
            {summary.prs.map((pr, i) => (
              <View key={i} style={styles.prCard}>
                <View style={styles.prBadge}>
                  <Text style={styles.prBadgeText}>PR</Text>
                </View>
                <View style={styles.prInfo}>
                  <Text style={styles.prExercise}>{pr.exerciseName}</Text>
                  <Text style={styles.prWeight}>
                    {formatWeight(pr.weightKg, unit)} x {pr.reps}
                  </Text>
                  {pr.previousBestReps !== null ? (
                    <Text style={styles.prPrevious}>
                      Previous best: {pr.previousBestReps} reps
                    </Text>
                  ) : (
                    <Text style={styles.prPrevious}>First time at this weight</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Exercise Highlights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercise Highlights</Text>
          {summary.perExerciseBest.map((ex, i) => (
            <View key={i} style={styles.exerciseRow}>
              <Text style={styles.exerciseName} numberOfLines={1}>{ex.exerciseName}</Text>
              <Text style={styles.exerciseStat}>
                {formatWeight(ex.weight, unit)}
                {ex.reps != null ? ` x ${ex.reps}` : ''}
              </Text>
            </View>
          ))}
        </View>

        {/* Volume by Muscle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sets by Muscle Group</Text>
          {Object.entries(summary.volumeByMuscle)
            .sort(([, a], [, b]) => b - a)
            .map(([muscle, sets]) => (
              <View key={muscle} style={styles.muscleRow}>
                <Text style={styles.muscleName}>
                  {muscle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Text>
                <View style={styles.muscleBarOuter}>
                  <View
                    style={[
                      styles.muscleBarInner,
                      { width: `${Math.max((sets / Math.max(...Object.values(summary.volumeByMuscle))) * 100, 8)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.muscleCount}>{sets}</Text>
              </View>
            ))}
        </View>

        {/* Meso Comparison */}
        {tonnageHistory.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mesocycle Progress</Text>
            <Text style={styles.mesoSubtitle}>
              Session {summary.mesoComparison.sessionsCompleted} · {summary.mesoComparison.totalMesoSets} total sets
            </Text>
            <View style={styles.tonnageChart}>
              {tonnageHistory.map((t, i) => {
                const isCurrentSession = i === tonnageHistory.length - 1;
                const barHeight = Math.max((t.tonnage / maxTonnage) * 100, 4);
                return (
                  <View key={i} style={styles.tonnageBarWrapper}>
                    <Text style={styles.tonnageValue}>{formatTonnage(t.tonnage, unit)}</Text>
                    <View
                      style={[
                        styles.tonnageBar,
                        { height: `${barHeight}%` },
                        isCurrentSession && styles.tonnageBarCurrent,
                      ]}
                    />
                    <Text style={styles.tonnageLabel}>
                      {new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Done Button */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.replace('/(tabs)/train')}
        >
          <Text style={styles.doneBtnText}>Done</Text>
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
    paddingBottom: SPACING.xxxl * 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text_primary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text_secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text_primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text_tertiary,
    marginTop: SPACING.xs,
  },
  section: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text_primary,
    marginBottom: SPACING.md,
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent_subtle,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  prBadge: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.md,
  },
  prBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text_on_accent,
  },
  prInfo: {
    flex: 1,
  },
  prExercise: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text_primary,
  },
  prWeight: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent_primary,
    marginTop: 2,
  },
  prPrevious: {
    fontSize: 13,
    color: COLORS.text_tertiary,
    marginTop: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border_subtle,
  },
  exerciseName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text_primary,
    marginRight: SPACING.sm,
  },
  exerciseStat: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text_secondary,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  muscleName: {
    width: 90,
    fontSize: 13,
    color: COLORS.text_secondary,
  },
  muscleBarOuter: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.bg_input,
    borderRadius: 4,
    marginHorizontal: SPACING.sm,
    overflow: 'hidden',
  },
  muscleBarInner: {
    height: '100%',
    backgroundColor: COLORS.accent_primary,
    borderRadius: 4,
  },
  muscleCount: {
    width: 24,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text_primary,
    textAlign: 'right',
  },
  mesoSubtitle: {
    fontSize: 13,
    color: COLORS.text_tertiary,
    marginBottom: SPACING.md,
  },
  tonnageChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: SPACING.lg,
  },
  tonnageBarWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  tonnageValue: {
    fontSize: 10,
    color: COLORS.text_tertiary,
    marginBottom: SPACING.xs,
  },
  tonnageBar: {
    width: '60%',
    backgroundColor: COLORS.accent_muted,
    borderRadius: 4,
    minHeight: 4,
  },
  tonnageBarCurrent: {
    backgroundColor: COLORS.accent_primary,
  },
  tonnageLabel: {
    fontSize: 10,
    color: COLORS.text_tertiary,
    marginTop: SPACING.xs,
  },
  doneBtn: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text_on_accent,
  },
});
