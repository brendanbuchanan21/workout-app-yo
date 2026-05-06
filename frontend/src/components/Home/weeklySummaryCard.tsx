import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { CardGradientSurface } from '../shared/CardGradientSurface';
import { MUSCLE_LABELS } from '../../constants/training';

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

const RING_SIZE = 100;
/** Thin track keeps this card secondary to Today's Workout play ring. */
const RING_STROKE = 5;

function getStatus(targetSets: number, completedSets: number) {
  if (targetSets === 0) {
    return { label: 'NO TARGET', color: COLORS.text_tertiary, ringColor: COLORS.accent_muted };
  }
  const pct = completedSets / targetSets;
  /** Stay inside the amber rail: avoid warning yellow and gold, which read louder than this card should. */
  if (pct >= 1) return { label: 'ON TARGET', color: COLORS.accent_light, ringColor: COLORS.accent_primary };
  if (pct >= 0.5) return { label: 'ON TRACK', color: COLORS.accent_primary, ringColor: COLORS.accent_primary };
  return { label: 'BEHIND', color: COLORS.text_secondary, ringColor: COLORS.accent_muted };
}

/** Bar chroma only; numbers stay mostly neutral so nothing screams yellow/gold. */
/** Bar fills: one amber step for "enough", muted for behind; numbers stay neutral. */
function getBarFill(progress: number) {
  if (progress >= 0.5) return COLORS.accent_primary;
  return COLORS.accent_muted;
}

export default function WeeklySummaryCard({ weeklyVolume }: { weeklyVolume: WeeklyVolumeData | null }) {
  const { targetSets, completedSets, muscleRows } = getWeeklyVolumeStats(weeklyVolume);
  const pct = targetSets > 0 ? Math.min(completedSets / targetSets, 1) : 0;
  const status = getStatus(targetSets, completedSets);

  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <CardGradientSurface gradientId="homeWeeklyVolume" style={styles.summaryCard}>
      <View style={styles.summaryCardInner}>
        <View style={styles.header}>
          <Text style={styles.summaryTitle}>Weekly Volume</Text>
          <View style={[styles.statusPill, { backgroundColor: status.color + '1F', borderColor: status.color + '4D' }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.ringWrap}>
            <Svg
              width={RING_SIZE}
              height={RING_SIZE}
              style={{ transform: [{ rotate: '-90deg' }] }}
            >
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                fill="none"
                stroke={COLORS.bg_input}
                strokeWidth={RING_STROKE}
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                fill="none"
                stroke={status.ringColor}
                strokeWidth={RING_STROKE}
                strokeDasharray={`${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                opacity={0.92}
              />
            </Svg>
            <View style={styles.ringCenter} pointerEvents="none">
              <Text style={styles.ringValue}>{completedSets}</Text>
              <Text style={styles.ringTarget}>of {targetSets || '--'}</Text>
              <Text style={styles.ringUnit}>sets</Text>
            </View>
          </View>

          <View style={styles.bars}>
            {muscleRows.length > 0 ? muscleRows.map((row) => {
              const fillColor = getBarFill(row.progress);
              const widthPct = Math.max(row.progress * 100, 6);
              return (
                <View key={row.muscle} style={styles.muscleBarRow}>
                  <View style={styles.muscleBarHeader}>
                    <Text style={styles.muscleBarLabel} numberOfLines={1}>{row.label}</Text>
                    <Text style={styles.muscleBarValue}>
                      {row.completedSets}/{row.targetSets}
                    </Text>
                  </View>
                  <View style={styles.muscleTrack}>
                    <View style={[styles.muscleFill, { width: `${widthPct}%`, backgroundColor: fillColor }]} />
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
      </View>
    </CardGradientSurface>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginTop: SPACING.md,
    marginBottom: 0,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  summaryCardInner: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  summaryTitle: {
    color: COLORS.text_primary,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    color: COLORS.text_primary,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  ringTarget: {
    color: COLORS.text_secondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  ringUnit: {
    color: COLORS.text_tertiary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  bars: {
    flex: 1,
    gap: SPACING.sm + 2,
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
    fontSize: 12,
    fontWeight: '800',
  },
  muscleBarValue: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.text_secondary,
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
