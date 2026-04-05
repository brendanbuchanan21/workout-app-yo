import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';

interface WeeklyVolumeBreakdownProps {
  lengthWeeks: number;
  currentWeek: number;
  volumeTargets: Record<string, number>;
  data: Record<string, (number | null)[]>;
}

const ROW_HEIGHT = 44;
const BAR_AREA_HEIGHT = 28;
const BAR_GAP = 4;
const LABEL_COL_WIDTH = 88;

export default function WeeklyVolumeBreakdown({
  lengthWeeks,
  currentWeek,
  volumeTargets,
  data,
}: WeeklyVolumeBreakdownProps) {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - SPACING.xl * 2 - SPACING.lg * 2;
  const barsAreaWidth = chartWidth - LABEL_COL_WIDTH;
  const barSlot = barsAreaWidth / lengthWeeks;
  const barWidth = Math.max(8, barSlot - BAR_GAP);

  // Only show muscles that have a target > 0
  const muscles = Object.keys(volumeTargets)
    .filter((m) => (volumeTargets[m] || 0) > 0)
    .sort((a, b) => (volumeTargets[b] || 0) - (volumeTargets[a] || 0));

  if (muscles.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Volume Progress</Text>
        <Text style={styles.subtitle}>
          Week {currentWeek} of {lengthWeeks}
        </Text>
      </View>

      {/* Week labels */}
      <View style={[styles.weekLabelRow, { paddingLeft: LABEL_COL_WIDTH }]}>
        {Array.from({ length: lengthWeeks }).map((_, i) => {
          const weekNum = i + 1;
          const isCurrent = weekNum === currentWeek;
          return (
            <View key={i} style={{ width: barSlot, alignItems: 'center' }}>
              <Text
                style={[
                  styles.weekLabel,
                  isCurrent && { color: COLORS.accent_primary, fontWeight: '700' },
                ]}
              >
                W{weekNum}
              </Text>
            </View>
          );
        })}
      </View>

      {muscles.map((muscle) => {
        const target = volumeTargets[muscle] || 0;
        const weekly = data[muscle] || Array(lengthWeeks).fill(null);
        // Scale bars to 120% of target so overshoots are visible
        const scaleMax = target * 1.2;

        return (
          <View key={muscle} style={styles.muscleRow}>
            <View style={styles.labelCol}>
              <Text style={styles.muscleLabel} numberOfLines={1}>
                {MUSCLE_LABELS[muscle] || muscle}
              </Text>
              <Text style={styles.targetLabel}>{target} sets</Text>
            </View>

            <Svg width={barsAreaWidth} height={BAR_AREA_HEIGHT}>
              {/* Target line */}
              <Line
                x1={0}
                y1={BAR_AREA_HEIGHT - (target / scaleMax) * BAR_AREA_HEIGHT}
                x2={barsAreaWidth}
                y2={BAR_AREA_HEIGHT - (target / scaleMax) * BAR_AREA_HEIGHT}
                stroke={COLORS.text_tertiary}
                strokeWidth={1}
                strokeDasharray="2,2"
              />

              {weekly.map((sets, i) => {
                const weekNum = i + 1;
                const isCurrent = weekNum === currentWeek;
                const isFuture = weekNum > currentWeek;
                const isPast = weekNum < currentWeek;
                const x = i * barSlot + (barSlot - barWidth) / 2;

                // Empty outline for future weeks or null past weeks
                if (sets === null || sets === 0) {
                  return (
                    <Rect
                      key={i}
                      x={x}
                      y={0}
                      width={barWidth}
                      height={BAR_AREA_HEIGHT}
                      fill="transparent"
                      stroke={COLORS.border_subtle}
                      strokeWidth={1}
                      rx={2}
                    />
                  );
                }

                const clamped = Math.min(sets, scaleMax);
                const barH = (clamped / scaleMax) * BAR_AREA_HEIGHT;
                const y = BAR_AREA_HEIGHT - barH;

                let fill = COLORS.text_tertiary;
                if (isCurrent) fill = COLORS.accent_primary;
                else if (isPast) fill = sets >= target ? COLORS.success : COLORS.accent_muted;
                else if (isFuture) fill = COLORS.text_tertiary;

                return (
                  <Rect
                    key={i}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    fill={fill}
                    rx={2}
                  />
                );
              })}
            </Svg>
          </View>
        );
      })}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: COLORS.accent_primary }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: COLORS.success }]} />
          <Text style={styles.legendText}>Target hit</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: COLORS.accent_muted }]} />
          <Text style={styles.legendText}>Under target</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDashed} />
          <Text style={styles.legendText}>Target</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.text_tertiary,
    fontSize: 12,
  },
  weekLabelRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  weekLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    fontWeight: '600',
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
  },
  labelCol: {
    width: LABEL_COL_WIDTH,
    paddingRight: SPACING.sm,
  },
  muscleLabel: {
    color: COLORS.text_primary,
    fontSize: 13,
    fontWeight: '600',
  },
  targetLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    marginTop: 1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.md,
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
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendDashed: {
    width: 12,
    height: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.text_tertiary,
    borderStyle: 'dashed',
  },
  legendText: {
    color: COLORS.text_tertiary,
    fontSize: 10,
  },
});
