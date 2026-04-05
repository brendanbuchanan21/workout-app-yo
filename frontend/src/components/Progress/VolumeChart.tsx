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
  selectedMuscle?: string | null;
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

export default function VolumeChart({ volumeWeeks, muscles, selectedMuscle }: VolumeChartProps) {
  const chartWidth = screenWidth - SPACING.xl * 2 - SPACING.lg * 2;
  const chartHeight = 180;
  const padding = { top: 10, right: 10, bottom: 25, left: 35 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  // Scale Y-axis: when a muscle is selected, scale to that muscle's max
  let maxMuscleVal = 0;
  if (selectedMuscle) {
    for (const week of volumeWeeks) {
      const val = week.muscles[selectedMuscle] || 0;
      if (val > maxMuscleVal) maxMuscleVal = val;
    }
  } else {
    for (const week of volumeWeeks) {
      for (const val of Object.values(week.muscles)) {
        if (val > maxMuscleVal) maxMuscleVal = val;
      }
    }
  }
  if (maxMuscleVal === 0) maxMuscleVal = 1;

  const muscleLines = muscles.map((muscle) => {
    let hasData = false;
    for (const week of volumeWeeks) {
      if ((week.muscles[muscle] || 0) > 0) { hasData = true; break; }
    }
    if (!hasData) return null;

    const points = volumeWeeks
      .map((week, i) => {
        const val = week.muscles[muscle] || 0;
        const x = padding.left + (i / Math.max(volumeWeeks.length - 1, 1)) * innerW;
        const y = padding.top + (1 - val / maxMuscleVal) * innerH;
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
              {Math.round(maxMuscleVal * frac)}
            </SvgText>
          );
        })}
        {volumeWeeks.length > 0 && (() => {
          const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          // Pick ~4-5 evenly spaced label positions
          const n = volumeWeeks.length;
          const labelCount = Math.min(5, n);
          const labels: { x: number; text: string }[] = [];
          let prevYear: number | null = null;

          for (let li = 0; li < labelCount; li++) {
            const idx = labelCount === 1 ? 0 : Math.round(li * (n - 1) / (labelCount - 1));
            const d = new Date(volumeWeeks[idx].weekStart + 'T00:00:00');
            const month = MONTH_NAMES[d.getMonth()];
            const year = d.getFullYear();
            const showYear = prevYear !== null && year !== prevYear;
            prevYear = year;
            const text = li === 0
              ? `${month} '${String(year).slice(2)}`
              : showYear
                ? `${month} '${String(year).slice(2)}`
                : month;
            const x = padding.left + (idx / Math.max(n - 1, 1)) * innerW;
            labels.push({ x, text });
          }

          return labels.map(({ x, text }, i) => (
            <SvgText
              key={i}
              x={x}
              y={chartHeight - 4}
              fontSize={9}
              fill={COLORS.text_tertiary}
              textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
            >
              {text}
            </SvgText>
          ));
        })()}
        {muscleLines.map(({ muscle, points }) => {
          const isSelected = !selectedMuscle || muscle === selectedMuscle;
          return (
            <Polyline
              key={muscle}
              points={points}
              fill="none"
              stroke={getMuscleColor(muscle)}
              strokeWidth={isSelected ? 2 : 1}
              strokeLinejoin="round"
              opacity={isSelected ? 1 : 0.15}
            />
          );
        })}
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
