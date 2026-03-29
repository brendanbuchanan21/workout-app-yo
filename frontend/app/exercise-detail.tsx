import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../src/utils/api';
import { COLORS, SPACING } from '../src/constants/theme';
import TimeRangePicker, { TimeRange } from '../src/components/ExerciseDetail/TimeRangePicker';
import SummaryStats from '../src/components/ExerciseDetail/SummaryStats';
import E1rmChart from '../src/components/ExerciseDetail/E1rmChart';
import PeriodComparison from '../src/components/ExerciseDetail/PeriodComparison';
import TonnageChart from '../src/components/ExerciseDetail/TonnageChart';
import SessionList from '../src/components/ExerciseDetail/SessionList';

interface ExerciseDetail {
  exercise: {
    catalogId: string;
    exerciseName: string;
    primaryMuscle: string;
    equipment: string;
    movementType: string;
  };
  summary: {
    totalSessions: number;
    currentE1rmKg: number;
    peakE1rmKg: number;
    peakE1rmDate: string;
  };
  periodComparison: {
    startAvgE1rmKg: number;
    endAvgE1rmKg: number;
    changePercent: number;
    startAvgTonnageKg: number;
    endAvgTonnageKg: number;
    startAvgBestWeight: number;
    startAvgBestReps: number;
    endAvgBestWeight: number;
    endAvgBestReps: number;
  } | null;
  sessions: {
    date: string;
    e1rmKg: number;
    bestWeightKg: number;
    bestReps: number;
    totalTonnageKg: number;
    totalSets: number;
    isPR: boolean;
    sets: { setNumber: number; weightKg: number; reps: number; rir: number | null }[];
  }[];
  prs: { weightKg: number; reps: number; date: string }[];
}

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const { catalogId, exerciseName } = useLocalSearchParams<{ catalogId: string; exerciseName: string }>();
  const [range, setRange] = useState<TimeRange>('6m');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['exercise-detail', catalogId, range],
    queryFn: async () => {
      const res = await apiGet(`/training/exercise/${catalogId}/detail?range=${range}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.detail as ExerciseDetail;
    },
    enabled: !!catalogId,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent_primary} />
        </View>
      </SafeAreaView>
    );
  }

  const detail = data;
  const previousE1rm = detail && detail.sessions.length >= 2
    ? detail.sessions[detail.sessions.length - 2].e1rmKg
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{exerciseName || detail?.exercise.exerciseName}</Text>
        {detail?.exercise && (
          <Text style={styles.subtitle}>
            {detail.exercise.primaryMuscle} · {detail.exercise.equipment} · {detail.exercise.movementType}
          </Text>
        )}

        <TimeRangePicker selected={range} onSelect={setRange} />

        {!detail || detail.sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Data</Text>
            <Text style={styles.emptyText}>
              No completed sessions found for this time range. Try selecting a longer period.
            </Text>
          </View>
        ) : (
          <>
            <SummaryStats
              currentE1rmKg={detail.summary.currentE1rmKg}
              peakE1rmKg={detail.summary.peakE1rmKg}
              peakE1rmDate={detail.summary.peakE1rmDate}
              totalSessions={detail.summary.totalSessions}
              previousE1rmKg={previousE1rm}
            />

            <E1rmChart
              sessions={detail.sessions}
              peakE1rmKg={detail.summary.peakE1rmKg}
            />

            {detail.periodComparison && (
              <PeriodComparison {...detail.periodComparison} />
            )}

            <TonnageChart sessions={detail.sessions} />

            <SessionList
              sessions={detail.sessions}
              expandedSession={expandedSession}
              onToggle={(date) => setExpandedSession(date || null)}
            />
          </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  backText: {
    color: COLORS.accent_primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scroll: {
    padding: SPACING.xl,
    paddingTop: 0,
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text_primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    marginBottom: SPACING.lg,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyTitle: {
    color: COLORS.text_primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
