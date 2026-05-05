import { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Polygon,
  Polyline,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { CardGradientSurface } from '../shared/CardGradientSurface';
import { getDateDomain, getDateTicks, getDateX } from './chartAxis';
import { TimeRange } from './TimeRangePicker';

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

function formatSessionDate(date: string): string {
  return new Date(`${date.split('T')[0]}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function E1rmChart({ sessions, peakE1rmKg, range }: E1rmChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (sessions.length < 2) return null;

  const sortedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const chartWidth = screenWidth - SPACING.xl * 2;
  const chartHeight = 220;
  const padding = { top: 20, right: 16, bottom: 36, left: 50 };
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
  const baselineY = padding.top + innerH;
  const areaPoints = dataPoints.length > 1
    ? `${dataPoints[0].x},${baselineY} ${polylinePoints} ${dataPoints[dataPoints.length - 1].x},${baselineY}`
    : '';

  // Peak e1RM dashed line
  const peakY = padding.top + (1 - (peakE1rmKg - minE) / e1rmRange) * innerH;
  const activePoint = activeIndex !== null ? dataPoints[activeIndex] : null;
  const activeSession = activeIndex !== null ? sortedSessions[activeIndex] : null;

  const setActiveFromX = (locationX: number) => {
    const boundedX = Math.max(padding.left, Math.min(locationX, chartWidth - padding.right));
    let nearestIndex = 0;
    let nearestDistance = Number.MAX_SAFE_INTEGER;

    dataPoints.forEach((point, index) => {
      const distance = Math.abs(point.x - boundedX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActiveIndex(nearestIndex);
  };

  const responderHandlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (event: any) => setActiveFromX(event.nativeEvent.locationX),
    onResponderMove: (event: any) => setActiveFromX(event.nativeEvent.locationX),
    onResponderRelease: () => setActiveIndex(null),
    onResponderTerminate: () => setActiveIndex(null),
    onMouseMove: (event: any) => {
      const locationX = event.nativeEvent?.locationX ?? event.nativeEvent?.offsetX;
      if (typeof locationX === 'number') setActiveFromX(locationX);
    },
    onMouseLeave: () => setActiveIndex(null),
  } as any;

  return (
    <CardGradientSurface gradientId="exDetailE1rmChart" style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Estimated 1RM</Text>
        {activeSession && (
          <View style={styles.readout}>
            <Text style={styles.readoutValue}>
              {Math.round(activeSession.e1rmKg * 2.20462)} lb
            </Text>
            <Text style={styles.readoutMeta}>
              {formatSessionDate(activeSession.date)}
              {activeSession.isPR ? ' · PR' : ''}
            </Text>
          </View>
        )}
      </View>
      {!activeSession && (
        <Text style={styles.chartHint}>Drag chart for details</Text>
      )}
      <View style={styles.chartWrap} {...responderHandlers}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="e1rmChartFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={COLORS.accent_primary} stopOpacity="0.26" />
              <Stop offset="0.55" stopColor={COLORS.accent_primary} stopOpacity="0.1" />
              <Stop offset="1" stopColor={COLORS.accent_primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          <Rect
            x={padding.left}
            y={padding.top}
            width={innerW}
            height={innerH}
            fill={COLORS.bg_secondary}
          />

          {Array.from({ length: 13 }).map((_, i) => {
            const x = padding.left + (i / 12) * innerW;
            return (
              <Line
                key={`gx${i}`}
                x1={x}
                y1={padding.top}
                x2={x}
                y2={padding.top + innerH}
                stroke={COLORS.border}
                strokeWidth={1}
                opacity={0.55}
              />
            );
          })}

          {Array.from({ length: 4 }).map((_, i) => {
            const y = padding.top + (i / 3) * innerH;
            return (
              <Line
                key={`gy${i}`}
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke={COLORS.border}
                strokeWidth={1}
                opacity={0.42}
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
                opacity={0.75}
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
            opacity={0.85}
          />

          {/* X-axis month labels */}
          {xLabels.map(({ x, label }, i) => (
            <SvgText
              key={`xl${i}`}
              x={x}
              y={chartHeight - 4}
              fontSize={9}
              fill={COLORS.text_tertiary}
              opacity={0.8}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          ))}

          {areaPoints.length > 0 && (
            <Polygon
              points={areaPoints}
              fill="url(#e1rmChartFill)"
            />
          )}

          {/* Line */}
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={COLORS.accent_primary}
            strokeWidth={2.25}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {activePoint && (
            <>
              <Line
                x1={activePoint.x}
                y1={padding.top}
                x2={activePoint.x}
                y2={padding.top + innerH}
                stroke={COLORS.accent_primary}
                strokeWidth={1}
                opacity={0.55}
              />
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={7}
                fill={COLORS.accent_glow}
              />
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={4.5}
                fill={COLORS.bg_secondary}
                stroke={COLORS.accent_primary}
                strokeWidth={2.25}
              />
            </>
          )}
        </Svg>
      </View>
    </CardGradientSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  title: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '800',
  },
  headerRow: {
    minHeight: 42,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  chartWrap: {
    alignItems: 'center',
  },
  chartHint: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: -SPACING.sm,
    marginBottom: SPACING.sm,
  },
  readout: {
    alignItems: 'flex-end',
  },
  readoutValue: {
    color: COLORS.text_primary,
    fontSize: 13,
    fontWeight: '800',
  },
  readoutMeta: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
