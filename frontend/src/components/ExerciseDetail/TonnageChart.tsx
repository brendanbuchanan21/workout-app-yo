import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface Session {
  date: string;
  totalTonnageKg: number;
}

interface TonnageChartProps {
  sessions: Session[];
}

const screenWidth = Dimensions.get('window').width;

function formatLabel(date: string): string {
  const d = new Date(date + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short' });
}

export default function TonnageChart({ sessions }: TonnageChartProps) {
  if (sessions.length < 2) return null;

  const chartWidth = screenWidth - SPACING.xl * 2;
  const chartHeight = 160;
  const padding = { top: 10, right: 15, bottom: 25, left: 50 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const tonnages = sessions.map((s) => s.totalTonnageKg);
  const maxT = Math.max(...tonnages) * 1.1;
  const barWidth = Math.max(4, Math.min(20, (innerW / sessions.length) * 0.7));
  const barGap = (innerW - barWidth * sessions.length) / Math.max(sessions.length - 1, 1);

  // Monthly x-axis labels
  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = '';
  for (let i = 0; i < sessions.length; i++) {
    const label = formatLabel(sessions[i].date);
    if (label !== lastMonth) {
      const x = padding.left + i * (barWidth + barGap) + barWidth / 2;
      monthLabels.push({ x, label });
      lastMonth = label;
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Tonnage</Text>
      <View style={{ alignItems: 'center' }}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Horizontal grid */}
          {[0, 0.5, 1].map((frac, i) => {
            const y = padding.top + (1 - frac) * innerH;
            const val = frac * maxT * 2.20462;
            return (
              <View key={`g${i}`}>
                <Line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke={COLORS.border_subtle}
                  strokeWidth={1}
                />
                <SvgText
                  x={padding.left - 6}
                  y={y + 4}
                  fontSize={9}
                  fill={COLORS.text_tertiary}
                  textAnchor="end"
                >
                  {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : Math.round(val)}
                </SvgText>
              </View>
            );
          })}

          {/* Bars */}
          {sessions.map((s, i) => {
            const barHeight = maxT > 0 ? (s.totalTonnageKg / maxT) * innerH : 0;
            const x = padding.left + i * (barWidth + barGap);
            const y = padding.top + innerH - barHeight;
            const isLast = i === sessions.length - 1;

            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={2}
                fill={isLast ? COLORS.accent_primary : COLORS.accent_muted}
                opacity={isLast ? 1 : 0.6}
              />
            );
          })}

          {/* X-axis labels */}
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
