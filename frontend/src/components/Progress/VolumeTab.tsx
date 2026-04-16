import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import VolumeChart from './VolumeChart';
import VolumeThenVsNow from './VolumeThenVsNow';
import ExerciseVolumeComparison from './ExerciseVolumeComparison';

type VolumeRange = '1m' | '3m' | '6m' | '1y';

interface VolumeWeek {
  weekStart: string;
  muscles: Record<string, number>;
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

interface Guardrail {
  floor: number;
  ceiling: number;
}

interface VolumeTabProps {
  exerciseComparison?: {
    currentWeek: number;
    exercises: ExerciseComparison[];
    muscleGroups: MuscleGroupComparison[];
  };
  initialMuscle?: string | null;
}

const RANGE_OPTIONS: { value: VolumeRange; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
];

const RANGE_MONTHS: Record<VolumeRange, number> = {
  '1m': 1, '3m': 3, '6m': 6, '1y': 12,
};

function formatMuscle(muscle: string): string {
  return muscle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function VolumeTab({ exerciseComparison, initialMuscle }: VolumeTabProps) {
  const [range, setRange] = useState<VolumeRange>('3m');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(initialMuscle ?? null);

  // When the parent hands us a new preselected muscle (e.g. deeplink from
  // the Insights tab), jump to it.
  useEffect(() => {
    if (initialMuscle) setSelectedMuscle(initialMuscle);
  }, [initialMuscle]);

  const volumeHistoryQuery = useQuery({
    queryKey: ['training', 'volume-history', range],
    queryFn: async () => {
      const res = await apiGet(`/training/volume-history?range=${range}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.weeks || []) as VolumeWeek[];
    },
  });

  const guardrailsQuery = useQuery({
    queryKey: ['training', 'volume-guardrails'],
    queryFn: async () => {
      const res = await apiGet('/training/volume-guardrails');
      if (!res.ok) return {} as Record<string, Guardrail>;
      const data = await res.json();
      return (data.guardrails || {}) as Record<string, Guardrail>;
    },
  });

  const allWeeks = volumeHistoryQuery.data ?? [];
  const guardrails = guardrailsQuery.data ?? {};

  // The backend returns 2x the requested range (to power VolumeThenVsNow).
  // Trim to the actual selected range for the chart + summary stats.
  const chartWeeks = (() => {
    const months = RANGE_MONTHS[range];
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return allWeeks.filter((w) => new Date(w.weekStart + 'T00:00:00') >= cutoff);
  })();

  // Union of muscles appearing in chart weeks + guardrails
  const availableMuscles = (() => {
    const set = new Set<string>();
    for (const week of chartWeeks) {
      for (const muscle of Object.keys(week.muscles)) set.add(muscle);
    }
    for (const muscle of Object.keys(guardrails)) set.add(muscle);
    return Array.from(set).sort();
  })();

  // Auto-pick a default muscle once data loads
  useEffect(() => {
    if (!selectedMuscle && availableMuscles.length > 0) {
      const preferred = availableMuscles.includes('chest') ? 'chest' : availableMuscles[0];
      setSelectedMuscle(preferred);
    }
  }, [availableMuscles, selectedMuscle]);

  const isLoading = volumeHistoryQuery.isLoading || guardrailsQuery.isLoading;

  // Summary stats for the selected muscle
  const selectedValues = selectedMuscle
    ? chartWeeks.map((w) => w.muscles[selectedMuscle] || 0)
    : [];
  const nonZeroCount = selectedValues.filter((v) => v > 0).length;
  const sum = selectedValues.reduce((a, b) => a + b, 0);
  const avg = nonZeroCount > 0 ? Math.round(sum / nonZeroCount) : 0;
  const peak = selectedValues.reduce((m, v) => (v > m ? v : m), 0);
  const current = selectedValues.length > 0 ? selectedValues[selectedValues.length - 1] : 0;
  const selectedGuardrail = selectedMuscle ? guardrails[selectedMuscle] : undefined;

  return (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Volume Trend</Text>
        <View style={styles.rangeRow}>
          {RANGE_OPTIONS.map(({ value, label }) => {
            const active = value === range;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setRange(value)}
                activeOpacity={0.7}
                hitSlop={8}
              >
                <Text style={[styles.rangeText, active && styles.rangeTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={COLORS.accent_primary}
          style={{ marginTop: SPACING.xxl }}
        />
      ) : availableMuscles.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Volume Data</Text>
          <Text style={styles.emptyText}>Complete workouts to see your volume trends.</Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {availableMuscles.map((muscle) => {
              const active = muscle === selectedMuscle;
              return (
                <TouchableOpacity
                  key={muscle}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSelectedMuscle(muscle)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {formatMuscle(muscle)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedMuscle && (
            <>
              <VolumeChart
                volumeWeeks={chartWeeks}
                selectedMuscle={selectedMuscle}
                guardrail={selectedGuardrail}
              />

              <View style={styles.summaryBlock}>
                <Text style={styles.summaryTitle}>
                  {formatMuscle(selectedMuscle)} , {range.toUpperCase()}
                </Text>
                <Text style={styles.summaryStats}>
                  Avg {avg} sets/wk , Peak {peak} , Current {current}
                </Text>
                {selectedGuardrail && (
                  <Text style={styles.summaryRange}>
                    Target range {selectedGuardrail.floor} to {selectedGuardrail.ceiling} sets
                  </Text>
                )}
              </View>
            </>
          )}
        </>
      )}

      {exerciseComparison && exerciseComparison.exercises.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: SPACING.xxl, marginBottom: SPACING.md }]}>Week {exerciseComparison.currentWeek} vs Previous</Text>
          <Text style={styles.chartSubtitle}>Per-exercise sets and tonnage</Text>
          <ExerciseVolumeComparison
            exercises={exerciseComparison.exercises}
            muscleGroups={exerciseComparison.muscleGroups}
            currentWeek={exerciseComparison.currentWeek}
          />
        </>
      )}

      {allWeeks.length > 0 && (
        <View style={{ marginTop: SPACING.xxl }}>
          <VolumeThenVsNow
            volumeWeeks={allWeeks}
            rangeMonths={RANGE_MONTHS[range]}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  rangeText: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  rangeTextActive: {
    color: COLORS.text_primary,
  },
  chartSubtitle: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    marginBottom: SPACING.md,
    marginTop: -SPACING.sm,
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
  chipRow: {
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg_elevated,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  chipActive: {
    backgroundColor: COLORS.bg_input,
    borderColor: COLORS.accent_primary,
  },
  chipText: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.text_primary,
  },
  summaryBlock: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  summaryTitle: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  summaryStats: {
    color: COLORS.text_secondary,
    fontSize: 12,
  },
  summaryRange: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    marginTop: 2,
  },
});
