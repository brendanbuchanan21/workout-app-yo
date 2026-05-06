import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';
import { CardGradientSurface } from '../shared/CardGradientSurface';

interface WeeklyVolumeBreakdownProps {
  lengthWeeks: number;
  currentWeek: number;
  volumeTargets: Record<string, number>;
  data: Record<string, (number | null)[]>;
}

const CHART_HEIGHT = 138;
const GROUP_GAP = SPACING.md;
const BAR_GAP = 4;

export default function WeeklyVolumeBreakdown({
  lengthWeeks,
  currentWeek,
  volumeTargets,
  data,
}: WeeklyVolumeBreakdownProps) {
  const [selectedMuscle, setSelectedMuscle] = useState('chest');
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - SPACING.xl * 2 - SPACING.lg * 2;

  const muscles = useMemo(
    () => Object.keys(volumeTargets)
      .filter((m) => (volumeTargets[m] || 0) > 0)
      .sort((a, b) => (volumeTargets[b] || 0) - (volumeTargets[a] || 0)),
    [volumeTargets]
  );

  useEffect(() => {
    if (muscles.length === 0) return;
    if (!muscles.includes(selectedMuscle)) {
      setSelectedMuscle(muscles.includes('chest') ? 'chest' : muscles[0]);
    }
  }, [muscles, selectedMuscle]);

  if (muscles.length === 0) {
    return null;
  }

  const activeMuscle = muscles.includes(selectedMuscle)
    ? selectedMuscle
    : muscles.includes('chest') ? 'chest' : muscles[0];
  const target = volumeTargets[activeMuscle] || 0;
  const weekly = data[activeMuscle] || Array(lengthWeeks).fill(null);
  const maxActual = Math.max(...weekly.map((sets) => sets || 0), 0);
  const scaleMax = Math.max(target, maxActual, 1) * 1.18;
  const groupWidth = (chartWidth - GROUP_GAP * (lengthWeeks - 1)) / lengthWeeks;
  const barWidth = Math.max(8, Math.min(18, (groupWidth - BAR_GAP) / 2));

  return (
    <CardGradientSurface gradientId="myProgramVolumeBreakdown" style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Volume Progress</Text>
          <Text style={styles.subtitle}>
            {MUSCLE_LABELS[activeMuscle] || activeMuscle} · {target} projected sets/week
          </Text>
        </View>
        <Text style={styles.weekPill}>Week {currentWeek} / {lengthWeeks}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.musclePicker}
      >
        {muscles.map((muscle) => {
          const isSelected = muscle === activeMuscle;
          return (
            <TouchableOpacity
              key={muscle}
              style={[styles.muscleChip, isSelected && styles.muscleChipSelected]}
              activeOpacity={0.78}
              onPress={() => setSelectedMuscle(muscle)}
            >
              <Text style={[styles.muscleChipText, isSelected && styles.muscleChipTextSelected]}>
                {MUSCLE_LABELS[muscle] || muscle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.chartWrap}>
        <View style={styles.targetLine} />
        <View style={styles.chart}>
        {Array.from({ length: lengthWeeks }).map((_, i) => {
          const weekNum = i + 1;
          const isCurrent = weekNum === currentWeek;
          const actual = weekly[i] || 0;
          const targetHeight = Math.max((target / scaleMax) * CHART_HEIGHT, 4);
          const actualHeight = actual > 0 ? Math.max((actual / scaleMax) * CHART_HEIGHT, 4) : 0;
          const actualColor = isCurrent ? COLORS.accent_muted : 'rgba(155, 154, 151, 0.72)';

          return (
            <View
              key={weekNum}
              style={[
                styles.weekGroup,
                { width: groupWidth, marginRight: weekNum === lengthWeeks ? 0 : GROUP_GAP },
              ]}
            >
              <View style={styles.barPair}>
                <View style={[styles.projectedBar, { width: barWidth, height: targetHeight }]} />
                <View
                  style={[
                    styles.actualBar,
                    {
                      width: barWidth,
                      height: actualHeight,
                      backgroundColor: actual > 0 ? actualColor : COLORS.bg_input,
                      borderWidth: actual > 0 ? 0 : 1,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.weekLabel, isCurrent && styles.weekLabelCurrent]}>
                W{weekNum}
              </Text>
              <Text style={styles.actualLabel}>{actual || '-'}</Text>
            </View>
          );
        })}
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.projectedLegend]} />
          <Text style={styles.legendText}>Projected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.actualLegend]} />
          <Text style={styles.legendText}>Actual</Text>
        </View>
      </View>
    </CardGradientSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  weekPill: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '700',
  },
  musclePicker: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  muscleChip: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  muscleChipSelected: {
    borderBottomColor: COLORS.accent_primary,
  },
  muscleChipText: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '700',
  },
  muscleChipTextSelected: {
    color: COLORS.accent_light,
  },
  chartWrap: {
    position: 'relative',
    paddingTop: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  targetLine: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    top: SPACING.sm + CHART_HEIGHT * 0.152,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  chart: {
    height: CHART_HEIGHT + 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.sm,
  },
  weekGroup: {
    alignItems: 'center',
  },
  barPair: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: BAR_GAP,
  },
  projectedBar: {
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
  },
  actualBar: {
    borderRadius: 3,
    borderColor: COLORS.border,
  },
  weekLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  weekLabelCurrent: {
    color: COLORS.accent_light,
  },
  actualLabel: {
    color: COLORS.text_secondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  projectedLegend: {
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
  },
  actualLegend: {
    backgroundColor: 'rgba(155, 154, 151, 0.72)',
  },
  legendText: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    fontWeight: '600',
  },
});
