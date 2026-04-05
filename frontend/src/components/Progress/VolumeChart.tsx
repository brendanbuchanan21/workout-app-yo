import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Rect, Circle, Text as SvgText } from 'react-native-svg';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface VolumeWeek {
  weekStart: string;
  muscles: Record<string, number>;
}

interface VolumeChartProps {
  volumeWeeks: VolumeWeek[];
  selectedMuscle: string;
  guardrail?: { floor: number; ceiling: number };
}

const screenWidth = Dimensions.get('window').width;

export default function VolumeChart({ volumeWeeks, selectedMuscle, guardrail }: VolumeChartProps) {
  const chartWidth = screenWidth - SPACING.xl * 2 - SPACING.lg * 2;
  const chartHeight = 200;
  const padding = { top: 12, right: 10, bottom: 25, left: 42 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const values = volumeWeeks.map((week) => week.muscles[selectedMuscle] || 0);
  const dataMax = values.reduce((m, v) => (v > m ? v : m), 0);
  const ceilingMax = guardrail ? guardrail.ceiling : 0;
  const rawMax = Math.max(dataMax, ceilingMax, 1);
  // Round up to a "nice" step so the y-axis labels land on clean numbers
  // instead of artifacts like 24 or 33 from a flat 10% headroom.
  const niceStep = rawMax <= 10 ? 2 : rawMax <= 30 ? 5 : 10;
  const maxY = Math.ceil((rawMax * 1.05) / niceStep) * niceStep;

  const yFor = (val: number) => padding.top + (1 - val / maxY) * innerH;
  const xFor = (i: number) =>
    padding.left + (i / Math.max(volumeWeeks.length - 1, 1)) * innerW;

  const points = values.map((val, i) => `${xFor(i)},${yFor(val)}`).join(' ');
  const color = COLORS.accent_primary;

  const bandTop = guardrail ? yFor(guardrail.ceiling) : 0;
  const bandBottom = guardrail ? yFor(guardrail.floor) : 0;

  return (
    <View style={styles.chartCard}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const y = padding.top + (1 - frac) * innerH;
          return (
            <Line
              key={`grid-${i}`}
              x1={padding.left}
              y1={y}
              x2={chartWidth - padding.right}
              y2={y}
              stroke={COLORS.border_subtle}
              strokeWidth={1}
            />
          );
        })}

        {/* Guardrail band */}
        {guardrail && (
          <>
            <Rect
              x={padding.left}
              y={bandTop}
              width={innerW}
              height={Math.max(bandBottom - bandTop, 0)}
              fill={COLORS.accent_subtle}
            />
            <Line
              x1={padding.left}
              y1={bandTop}
              x2={chartWidth - padding.right}
              y2={bandTop}
              stroke={COLORS.accent_primary}
              strokeWidth={1}
              strokeDasharray="2,3"
              opacity={0.4}
            />
            <Line
              x1={padding.left}
              y1={bandBottom}
              x2={chartWidth - padding.right}
              y2={bandBottom}
              stroke={COLORS.accent_primary}
              strokeWidth={1}
              strokeDasharray="2,3"
              opacity={0.4}
            />
          </>
        )}

        {/* Y-axis labels (top tick includes unit) */}
        {[0, 0.5, 1].map((frac, i) => {
          const y = padding.top + (1 - frac) * innerH;
          const value = Math.round(maxY * frac);
          const label = frac === 1 ? `${value} sets` : `${value}`;
          return (
            <SvgText
              key={`y-${i}`}
              x={padding.left - 4}
              y={y + 4}
              fontSize={9}
              fill={COLORS.text_tertiary}
              textAnchor="end"
            >
              {label}
            </SvgText>
          );
        })}

        {/* X-axis month labels */}
        {volumeWeeks.length > 0 && (() => {
          const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
              key={`x-${i}`}
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

        {/* Data line */}
        {volumeWeeks.length > 0 && (
          <Polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Data points */}
        {values.map((val, i) => (
          <Circle
            key={`pt-${i}`}
            cx={xFor(i)}
            cy={yFor(val)}
            r={3}
            fill={color}
          />
        ))}
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
    alignItems: 'center',
  },
});
