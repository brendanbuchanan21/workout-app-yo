import { View, Text, StyleSheet } from 'react-native';
import { MUSCLE_LABELS } from '../../constants/training';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';



interface MuscleVolumeRow {
    muscle: string;
    label: string;
    targetSets: number;
    completedSets: number;
    progress: number;
  }

  interface WeeklyVolumeData {
    lengthWeeks: number;
    currentWeek: number;
    volumeTargets: Record<string, number>;
    data: Record<string, (number | null)[]>;
  }

function getWeeklyVolumeStats(weeklyVolume: WeeklyVolumeData | null) {
    if (!weeklyVolume) {
      return {
        targetSets: 0,
        completedSets: 0,
        remainingSets: 0,
        muscleRows: [] as MuscleVolumeRow[],
      };
    }
  
    const currentWeekIndex = Math.max(0, weeklyVolume.currentWeek - 1);
    const targetSets = Object.values(weeklyVolume.volumeTargets || {})
      .reduce((sum, sets) => sum + sets, 0);
    const completedSets = Object.values(weeklyVolume.data || {})
      .reduce((sum, weeklySets) => sum + (weeklySets[currentWeekIndex] || 0), 0);
  
    const muscleRows = Object.entries(weeklyVolume.volumeTargets || {})
      .filter(([, target]) => target > 0)
      .map(([muscle, target]) => {
        const completed = weeklyVolume.data?.[muscle]?.[currentWeekIndex] || 0;
        return {
          muscle,
          label: MUSCLE_LABELS[muscle] || muscle,
          targetSets: target,
          completedSets: completed,
          progress: target > 0 ? Math.min(completed / target, 1) : 0,
        };
      })
      .sort((a, b) => {
        const aGap = Math.abs(a.targetSets - a.completedSets);
        const bGap = Math.abs(b.targetSets - b.completedSets);
        return bGap - aGap || b.targetSets - a.targetSets;
      })
      .slice(0, 3);
  
    return {
      targetSets,
      completedSets,
      remainingSets: Math.max(targetSets - completedSets, 0),
      muscleRows,
    };
  }


export default function WeeklySummaryCard({ weeklyVolume }: { weeklyVolume: WeeklyVolumeData | null }) {
    const { targetSets, completedSets, muscleRows } = getWeeklyVolumeStats(weeklyVolume);
    const pct = targetSets > 0 ? Math.min(completedSets / targetSets, 1) : 0.18;
    const aboveTarget = targetSets > 0 && completedSets >= targetSets;
  
    return (
      <View style={styles.summaryCard}>
        <View style={styles.volumeScore}>
          <Text style={styles.summaryTitle}>Weekly Volume</Text>
          <View style={styles.volumeTotalRow}>
            <Text style={[styles.volumeTotal, !aboveTarget && styles.volumeTotalBelow]}>{completedSets}</Text>
            <Text style={styles.volumeTarget}>/ {targetSets || '--'}</Text>
          </View>
          <View style={styles.totalTrack}>
            <View style={[styles.totalFill, { width: `${pct * 100}%` }]} />
          </View>
        </View>
  
        <View style={styles.Bars}>
          {muscleRows.length > 0 ? muscleRows.map((row) => {
            const aboveTarget = row.completedSets >= row.targetSets;
            return (
              <View key={row.muscle} style={styles.muscleBarRow}>
                <View style={styles.muscleBarHeader}>
                  <Text style={styles.muscleBarLabel} numberOfLines={1}>{row.label}</Text>
                  <Text style={[styles.muscleBarValue, aboveTarget && styles.muscleBarValueHit]}>
                    {row.completedSets}/{row.targetSets}
                  </Text>
                </View>
                <View style={styles.muscleTrack}>
                  <View
                    style={[
                      styles.muscleFill,
                      aboveTarget && styles.muscleFillHit,
                      { width: `${Math.max(row.progress * 100, 6)}%` },
                    ]}
                  />
                </View>
              </View>
            );
          }) : (
            <View style={styles.emptyVolumeState}>
              <Text style={styles.emptyVolumeText}>No muscle targets yet</Text>
            </View>
          )}
        </View>
      </View>
    );
  }


const styles = StyleSheet.create({
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: 0,
    overflow: 'hidden',
  },
  volumeScore: {
    width: 116,
  },
  Bars: {
    flex: 1,
    gap: 9,
  },
  summaryTitle: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 19,
  },
  volumeTotalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: SPACING.md,
  },
  volumeTotal: {
    color: COLORS.gold_primary,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 36,
  },
  volumeTotalBelow: {
    color: COLORS.text_primary,
  },
  volumeTarget: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 23,
    marginLeft: 3,
  },
  totalTrack: {
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg_input,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  totalFill: {
    height: '100%',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent_primary,
  },
  muscleBarRow: {
    minHeight: 28,
  },
  muscleBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: 5,
  },
  muscleBarLabel: {
    flex: 1,
    color: COLORS.text_primary,
    fontSize: 11,
    fontWeight: '800',
  },
  muscleBarValue: {
    color: COLORS.text_secondary,
    fontSize: 10,
    fontWeight: '800',
  },
  muscleBarValueHit: {
    color: COLORS.gold_light,
  },
  muscleTrack: {
    height: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg_input,
    overflow: 'hidden',
  },
  muscleFill: {
    height: '100%',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent_muted,
  },
  muscleFillHit: {
    backgroundColor: COLORS.gold_primary,
  },
  emptyVolumeState: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 82,
  },
  emptyVolumeText: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '700',
  },
});