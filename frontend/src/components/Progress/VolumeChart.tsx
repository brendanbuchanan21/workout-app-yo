import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface VolumeWeek {
  weekStart: string;
  muscles: Record<string, number>;
}

interface VolumeChartProps {
  volumeWeeks: VolumeWeek[];
  muscles: string[];
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

const screenWidth = Dimensions.get('window').width;

export default function VolumeChart({ volumeWeeks, muscles }: VolumeChartProps) {
  const chartWidth = screenWidth - SPACING.xl * 2 - SPACING.lg * 2;
  const chartHeight = 180;
  const padding = { top: 10, right: 10, bottom: 25, left: 35 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  let maxTotal = 0;
  for (const week of volumeWeeks) {
    const total = Object.values(week.muscles).reduce((a, b) => a + b, 0);
    if (total > maxTotal) maxTotal = total;
  }
  if (maxTotal === 0) maxTotal = 1;

  const totalPoints = volumeWeeks
    .map((week, i) => {
      const total = Object.values(week.muscles).reduce((a, b) => a + b, 0);
      const x = padding.left + (i / Math.max(volumeWeeks.length - 1, 1)) * innerW;
      const y = padding.top + (1 - total / maxTotal) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  const muscleLines = muscles.map((muscle) => {
    let maxMuscle = 0;
    for (const week of volumeWeeks) {
      if ((week.muscles[muscle] || 0) > maxMuscle) maxMuscle = week.muscles[muscle] || 0;
    }
    if (maxMuscle === 0) return null;

    const points = volumeWeeks
      .map((week, i) => {
        const val = week.muscles[muscle] || 0;
        const x = padding.left + (i / Math.max(volumeWeeks.length - 1, 1)) * innerW;
        const y = padding.top + (1 - val / maxTotal) * innerH;
        return `${x},${y}`;
      })
      .join(' ');

    return { muscle, points };
  }).filter(Boolean) as { muscle: string; points: string }[];

  return (
    <View style={styles.chartCard}>
      <Svg width={chartWidth} height={chartHeight}>
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const y = padding.top + (1 - frac) * innerH;
          return (
            <Line
              key={i}
              x1={padding.left}
              y1={y}
              x2={chartWidth - padding.right}
              y2={y}
              stroke={COLORS.border_subtle}
              strokeWidth={1}
            />
          );
        })}
        {[0, 0.5, 1].map((frac, i) => {
          const y = padding.top + (1 - frac) * innerH;
          return (
            <SvgText
              key={i}
              x={padding.left - 4}
              y={y + 4}
              fontSize={9}
              fill={COLORS.text_tertiary}
              textAnchor="end"
            >
              {Math.round(maxTotal * frac)}
            </SvgText>
          );
        })}
        {volumeWeeks.length > 0 && (
          <>
            <SvgText
              x={padding.left}
              y={chartHeight - 4}
              fontSize={8}
              fill={COLORS.text_tertiary}
              textAnchor="start"
            >
              {volumeWeeks[0].weekStart.slice(5)}
            </SvgText>
            <SvgText
              x={chartWidth - padding.right}
              y={chartHeight - 4}
              fontSize={8}
              fill={COLORS.text_tertiary}
              textAnchor="end"
            >
              {volumeWeeks[volumeWeeks.length - 1].weekStart.slice(5)}
            </SvgText>
          </>
        )}
        {muscleLines.map(({ muscle, points }) => (
          <Polyline
            key={muscle}
            points={points}
            fill="none"
            stroke={getMuscleColor(muscle)}
            strokeWidth={1.5}
            strokeLinejoin="round"
            opacity={0.7}
          />
        ))}
        <Polyline
          points={totalPoints}
          fill="none"
          stroke={COLORS.text_primary}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
});
