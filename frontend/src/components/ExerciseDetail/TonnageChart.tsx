import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { TimeRange } from './TimeRangePicker';

interface Session {
  date: string;
  totalTonnageKg: number;
}

interface TonnageChartProps {
  sessions: Session[];
  range: TimeRange;
}

const screenWidth = Dimensions.get('window').width;

function formatMonthLabel(date: string, includeYear: boolean): string {
  const d = new Date(`${date}T12:00:00`);
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  if (!includeYear) return month;
  return `${month} '${String(d.getFullYear()).slice(-2)}`;
}

export default function TonnageChart({ sessions, range }: TonnageChartProps) {
  if (sessions.length < 2) return null;

  const sortedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const chartWidth = screenWidth - SPACING.xl * 2;
  const chartHeight = 160;
  const padding = { top: 10, right: 15, bottom: 25, left: 50 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const tonnages = sortedSessions.map((s) => s.totalTonnageKg);
  const maxT = Math.max(...tonnages) * 1.1;
  const barWidth = Math.max(4, Math.min(20, (innerW / sortedSessions.length) * 0.7));
  const barGap = (innerW - barWidth * sortedSessions.length) / Math.max(sortedSessions.length - 1, 1);
  const spansYears = sortedSessions[0].date.slice(0, 4) !== sortedSessions[sortedSessions.length - 1].date.slice(0, 4);

  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = '';
  for (let i = 0; i < sortedSessions.length; i++) {
    const monthKey = sortedSessions[i].date.slice(0, 7);
    if (monthKey !== lastMonth) {
      monthLabels.push({
        x: padding.left + i * (barWidth + barGap) + barWidth / 2,
        label: formatMonthLabel(sortedSessions[i].date, spansYears || range === 'all'),
      });
      lastMonth = monthKey;
    }
  }

  const maxLabels = 4;
  const xLabels = monthLabels.length <= maxLabels
    ? monthLabels
    : monthLabels.filter((_, index) => (
      index === 0
      || index === monthLabels.length - 1
      || index % Math.ceil(monthLabels.length / maxLabels) === 0
    ));

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
          {sortedSessions.map((s, i) => {
            const barHeight = maxT > 0 ? (s.totalTonnageKg / maxT) * innerH : 0;
            const x = padding.left + i * (barWidth + barGap);
            const y = padding.top + innerH - barHeight;
            const isLast = i === sortedSessions.length - 1;

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
