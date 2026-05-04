import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { TimeRange } from './TimeRangePicker';
import { getDateDomain, getDateTicks, getDateX } from './chartAxis';

interface Session {
  date: string;
  e1rmKg: number;
  isPR: boolean;
}

interface E1rmChartProps {
  sessions: Session[];
  peakE1rmKg: number;
  range: TimeRange;
}

const screenWidth = Dimensions.get('window').width;

export default function E1rmChart({ sessions, peakE1rmKg, range }: E1rmChartProps) {
  if (sessions.length < 2) return null;

  const sortedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const chartWidth = screenWidth - SPACING.xl * 2;
  const chartHeight = 200;
  const padding = { top: 15, right: 15, bottom: 25, left: 50 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const { start, end, spansYears } = getDateDomain(sortedSessions.map((s) => s.date), range);
  const xLabels = getDateTicks(start, end, padding.left, innerW, spansYears || range === 'all');

  const e1rms = sortedSessions.map((s) => s.e1rmKg);
  const minE = Math.min(...e1rms) * 0.95;
  const maxE = Math.max(...e1rms) * 1.05;
  const e1rmRange = maxE - minE || 1;

  const dataPoints = sortedSessions.map((s) => ({
    x: getDateX(s.date, start, end, padding.left, innerW),
    y: padding.top + (1 - (s.e1rmKg - minE) / e1rmRange) * innerH,
    isPR: s.isPR,
  }));

  const polylinePoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Peak e1RM dashed line
  const peakY = padding.top + (1 - (peakE1rmKg - minE) / e1rmRange) * innerH;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Estimated 1RM</Text>
      <View style={{ alignItems: 'center' }}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
            const y = padding.top + (1 - frac) * innerH;
            const val = minE + frac * e1rmRange;
            return (
              <Line
                key={`g${i}`}
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke={COLORS.border_subtle}
                strokeWidth={1}
              />
            );
          })}

          {/* Y-axis labels */}
          {[0, 0.5, 1].map((frac, i) => {
            const y = padding.top + (1 - frac) * innerH;
            const val = minE + frac * e1rmRange;
            return (
              <SvgText
                key={`yl${i}`}
                x={padding.left - 6}
                y={y + 4}
                fontSize={10}
                fill={COLORS.text_tertiary}
                textAnchor="end"
              >
                {Math.round(val * 2.20462)}
              </SvgText>
            );
          })}

          {/* Peak dashed line */}
          <Line
            x1={padding.left}
            y1={peakY}
            x2={chartWidth - padding.right}
            y2={peakY}
            stroke={COLORS.accent_muted}
            strokeWidth={1}
            strokeDasharray="4,4"
          />

          {/* X-axis month labels */}
          {xLabels.map(({ x, label }, i) => (
            <SvgText
              key={`xl${i}`}
              x={x}
              y={chartHeight - 4}
              fontSize={9}
              fill={COLORS.text_tertiary}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          ))}

          {/* Line */}
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={COLORS.accent_primary}
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Data points */}
          {dataPoints.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.isPR ? 5 : 3}
              fill={p.isPR ? COLORS.accent_primary : COLORS.bg_elevated}
              stroke={COLORS.accent_primary}
              strokeWidth={p.isPR ? 0 : 1.5}
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
});
