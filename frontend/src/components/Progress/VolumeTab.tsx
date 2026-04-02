import { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import TimeRangePicker from '../shared/TimeRangePicker';
import VolumeChart from './VolumeChart';
import VolumeThenVsNow from './VolumeThenVsNow';

type VolumeRange = '1m' | '3m' | '6m' | '1y';

interface VolumeWeek {
  weekStart: string;
  muscles: Record<string, number>;
}

interface VolumeTabProps {
  currentVolume: Record<string, number>;
  volumeTargets: Record<string, number>;
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

export default function VolumeTab({ currentVolume, volumeTargets }: VolumeTabProps) {
  const [range, setRange] = useState<VolumeRange>('3m');

  const volumeHistoryQuery = useQuery({
    queryKey: ['training', 'volume-history', range],
    queryFn: async () => {
      const res = await apiGet(`/training/volume-history?range=${range}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.weeks || []) as VolumeWeek[];
    },
  });

  const volumeWeeks = volumeHistoryQuery.data ?? [];

  const allMuscles = Array.from(new Set([
    ...Object.keys(currentVolume),
    ...Object.keys(volumeTargets),
  ])).sort();

  const chartMuscles = new Set<string>();
  for (const week of volumeWeeks) {
    for (const muscle of Object.keys(week.muscles)) {
      chartMuscles.add(muscle);
    }
  }
  const sortedChartMuscles = Array.from(chartMuscles).sort();

  return (
    <>
      <TimeRangePicker
        selected={range}
        onSelect={setRange}
        options={RANGE_OPTIONS}
      />

      <Text style={styles.sectionTitle}>This Week</Text>
      {allMuscles.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Volume Data</Text>
          <Text style={styles.emptyText}>Complete workouts to see your weekly volume.</Text>
        </View>
      ) : (
        <View style={styles.volumeCard}>
          {allMuscles.map((muscle) => {
            const completed = currentVolume[muscle] || 0;
            const target = volumeTargets[muscle] || 0;
            const maxVal = Math.max(completed, target, 1);
            const pct = Math.min(completed / maxVal, 1);

            return (
              <View key={muscle} style={styles.volumeRow}>
                <Text style={styles.volumeLabel}>{formatMuscle(muscle)}</Text>
                <View style={styles.volumeBarContainer}>
                  <View
                    style={[
                      styles.volumeBar,
                      {
                        width: `${pct * 100}%`,
                        backgroundColor: COLORS.success,
                      },
                    ]}
                  />
                  {target > 0 && (
                    <View
                      style={[
                        styles.volumeTargetLine,
                        { left: `${Math.min((target / maxVal) * 100, 100)}%` },
                      ]}
                    />
                  )}
                </View>
                <Text style={styles.volumeCount}>
                  {completed}{target > 0 ? `/${target}` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {volumeHistoryQuery.isLoading ? (
        <ActivityIndicator
          size="small"
          color={COLORS.accent_primary}
          style={{ marginTop: SPACING.xxl }}
        />
      ) : (
        <>
          {volumeWeeks.length > 0 && (
            <View style={{ marginTop: SPACING.xxl }}>
              <VolumeThenVsNow
                volumeWeeks={volumeWeeks}
                rangeMonths={RANGE_MONTHS[range]}
              />
            </View>
          )}

          {volumeWeeks.length > 1 && sortedChartMuscles.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: SPACING.xxl }]}>Volume Over Time</Text>
              <Text style={styles.chartSubtitle}>Weekly sets per muscle group</Text>
              <VolumeChart volumeWeeks={volumeWeeks} muscles={sortedChartMuscles} />

              <View style={styles.legendContainer}>
                {sortedChartMuscles.map((muscle) => (
                  <View key={muscle} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: getMuscleColor(muscle) }]} />
                    <Text style={styles.legendText}>{formatMuscle(muscle)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </>
  );
}

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#E8912D',
  back: '#4ADE80',
  quads: '#60A5FA',
  hamstrings: '#A78BFA',
  side_delts: '#F472B6',
  rear_delts: '#FB923C',
  biceps: '#34D399',
  triceps: '#FBBF24',
  glutes: '#C084FC',
  calves: '#F87171',
  traps: '#38BDF8',
  abs: '#FB7185',
};

function getMuscleColor(muscle: string): string {
  return MUSCLE_COLORS[muscle] || COLORS.accent_primary;
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
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
  volumeCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  volumeLabel: {
    color: COLORS.text_secondary,
    fontSize: 12,
    width: 80,
  },
  volumeBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.sm,
    marginHorizontal: SPACING.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  volumeBar: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  volumeTargetLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.text_primary,
    opacity: 0.5,
  },
  volumeCount: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    width: 40,
    textAlign: 'right',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: COLORS.text_tertiary,
    fontSize: 10,
  },
});
