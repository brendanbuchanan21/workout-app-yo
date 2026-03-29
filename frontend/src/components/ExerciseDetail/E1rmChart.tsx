import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface Session {
  date: string;
  e1rmKg: number;
  isPR: boolean;
}

interface E1rmChartProps {
  sessions: Session[];
  peakE1rmKg: number;
}

const screenWidth = Dimensions.get('window').width;

function formatLabel(date: string): string {
  const d = new Date(date + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short' });
}

export default function E1rmChart({ sessions, peakE1rmKg }: E1rmChartProps) {
  if (sessions.length < 2) return null;

  const chartWidth = screenWidth - SPACING.xl * 2;
  const chartHeight = 200;
  const padding = { top: 15, right: 15, bottom: 25, left: 50 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const e1rms = sessions.map((s) => s.e1rmKg);
  const minE = Math.min(...e1rms) * 0.95;
  const maxE = Math.max(...e1rms) * 1.05;
  const range = maxE - minE || 1;

  const dataPoints = sessions.map((s, i) => ({
    x: padding.left + (i / Math.max(sessions.length - 1, 1)) * innerW,
    y: padding.top + (1 - (s.e1rmKg - minE) / range) * innerH,
    isPR: s.isPR,
  }));

  const polylinePoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Peak e1RM dashed line
  const peakY = padding.top + (1 - (peakE1rmKg - minE) / range) * innerH;

  // Monthly x-axis labels (deduplicated)
  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = '';
  for (let i = 0; i < sessions.length; i++) {
    const label = formatLabel(sessions[i].date);
    if (label !== lastMonth) {
      monthLabels.push({
        x: padding.left + (i / Math.max(sessions.length - 1, 1)) * innerW,
        label,
      });
      lastMonth = label;
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Estimated 1RM</Text>
      <View style={{ alignItems: 'center' }}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
            const y = padding.top + (1 - frac) * innerH;
            const val = minE + frac * range;
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
            const val = minE + frac * range;
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
          {monthLabels.map(({ x, label }, i) => (
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
