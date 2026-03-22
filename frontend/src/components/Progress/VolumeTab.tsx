import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import VolumeChart from './VolumeChart';

interface VolumeWeek {
  weekStart: string;
  muscles: Record<string, number>;
}

interface VolumeTabProps {
  currentVolume: Record<string, number>;
  volumeTargets: Record<string, number>;
  volumeWeeks: VolumeWeek[];
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

function formatMuscle(muscle: string): string {
  return muscle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function VolumeTab({ currentVolume, volumeTargets, volumeWeeks }: VolumeTabProps) {
  const allMuscles = Array.from(new Set([
    ...Object.keys(currentVolume),
    ...Object.keys(volumeTargets),
  ])).sort();

  const allTimeMuscles = new Set<string>();
  for (const week of volumeWeeks) {
    for (const muscle of Object.keys(week.muscles)) {
      allTimeMuscles.add(muscle);
    }
  }
  const chartMuscles = Array.from(allTimeMuscles).sort();

  return (
    <>
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
                        backgroundColor: getMuscleColor(muscle),
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

      {volumeWeeks.length > 0 && chartMuscles.length > 0 && (() => {
        const allTimeTotals: Record<string, number> = {};
        for (const week of volumeWeeks) {
          for (const [muscle, sets] of Object.entries(week.muscles)) {
            allTimeTotals[muscle] = (allTimeTotals[muscle] || 0) + sets;
          }
        }
        const sortedMuscles = Object.entries(allTimeTotals).sort((a, b) => b[1] - a[1]);
        const maxSets = sortedMuscles.length > 0 ? sortedMuscles[0][1] : 1;

        return (
          <>
            <Text style={[styles.sectionTitle, { marginTop: SPACING.xxl }]}>All-Time Volume</Text>
            <Text style={styles.chartSubtitle}>Total sets per muscle group</Text>
            <View style={styles.volumeCard}>
              {sortedMuscles.map(([muscle, total]) => (
                <View key={muscle} style={styles.volumeRow}>
                  <Text style={styles.volumeLabel}>{formatMuscle(muscle)}</Text>
                  <View style={styles.volumeBarContainer}>
                    <View
                      style={[
                        styles.volumeBar,
                        {
                          width: `${(total / maxSets) * 100}%`,
                          backgroundColor: getMuscleColor(muscle),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.volumeCount}>{total}</Text>
                </View>
              ))}
            </View>
          </>
        );
      })()}

      {volumeWeeks.length > 1 && chartMuscles.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: SPACING.xxl }]}>Volume Over Time</Text>
          <Text style={styles.chartSubtitle}>Weekly sets per muscle group</Text>
          <VolumeChart volumeWeeks={volumeWeeks} muscles={chartMuscles} />

          <View style={styles.legendContainer}>
            {chartMuscles.map((muscle) => (
              <View key={muscle} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: getMuscleColor(muscle) }]} />
                <Text style={styles.legendText}>{formatMuscle(muscle)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </>
  );
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
