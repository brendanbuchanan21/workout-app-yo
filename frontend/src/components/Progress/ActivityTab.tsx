import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface ActivityDay {
  count: number;
  labels: string[];
}

interface ActivityTabProps {
  activity: Record<string, ActivityDay>;
}

/** Do not shrink below this or the year grid becomes unreadable (was ~5px on phones). */
const MIN_CELL = 12;
const DAY_LABEL_COL = 22;
const cellGap = 1;

export default function ActivityTab({ activity }: ActivityTabProps) {
  const today = new Date();
  const totalWeeks = 52;
  const cellSize = MIN_CELL;

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (totalWeeks * 7));
  const dayOfWeek = startDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + mondayOffset);

  const cells: { date: string; count: number; col: number; row: number }[] = [];
  const monthLabels: { label: string; col: number }[] = [];
  const monthSeparators: number[] = [];
  let lastMonth = -1;

  const cursor = new Date(startDate);
  for (let col = 0; col < totalWeeks; col++) {
    for (let row = 0; row < 7; row++) {
      const dateKey = cursor.toISOString().split('T')[0];
      const dayActivity = activity[dateKey];
      const count = dayActivity?.count || 0;

      if (cursor <= today) {
        cells.push({ date: dateKey, count, col, row });
      }

      if (row === 0 && cursor.getMonth() !== lastMonth) {
        if (lastMonth !== -1) monthSeparators.push(col * (cellSize + cellGap) - cellGap / 2);
        lastMonth = cursor.getMonth();
        monthLabels.push({
          label: cursor.toLocaleDateString('en-US', { month: 'short' }),
          col,
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const totalWorkouts = Object.values(activity).reduce((sum, d) => sum + d.count, 0);
  const activeDays = Object.keys(activity).length;
  const recentMonthWorkouts = cells
    .filter((cell) => cell.count > 0)
    .filter((cell) => {
      const date = new Date(cell.date);
      const daysAgo = (today.getTime() - date.getTime()) / 86400000;
      return daysAgo <= 30;
    })
    .reduce((sum, cell) => sum + cell.count, 0);

  let streak = 0;
  const streakCursor = new Date(today);
  const todayKey = streakCursor.toISOString().split('T')[0];
  if (!activity[todayKey]) {
    streakCursor.setDate(streakCursor.getDate() - 1);
  }
  while (true) {
    const key = streakCursor.toISOString().split('T')[0];
    if (activity[key]) {
      streak++;
      streakCursor.setDate(streakCursor.getDate() - 1);
    } else {
      break;
    }
  }

  const gridWidth = totalWeeks * (cellSize + cellGap);
  const gridHeight = 7 * (cellSize + cellGap);
  const monthRowHeight = 18;
  const todayDateKey = today.toISOString().split('T')[0];

  function getCellColor(count: number): string {
    if (count === 0) return '#2B2B31';
    if (count === 1) return '#8F5621';
    if (count === 2) return '#C87424';
    if (count === 3) return '#E8912D';
    return '#FFB457';
  }

  return (
    <>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Workouts</Text>
          <Text style={styles.statValue}>{totalWorkouts}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Days</Text>
          <Text style={styles.statValue}>{activeDays}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={styles.statValue}>{streak}d</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View style={styles.chartHeaderText}>
            <Text style={styles.chartTitle}>Workout Activity</Text>
            <Text style={styles.chartSummary}>
              {totalWorkouts} sessions logged over the last year
            </Text>
          </View>
          <View style={styles.chartBadge}>
            <Text style={styles.chartBadgeValue}>{recentMonthWorkouts}</Text>
            <Text style={styles.chartBadgeLabel}>Last 30d</Text>
          </View>
        </View>
        <Text style={styles.chartHint}>Swipe to scan the full year</Text>
        <View style={styles.heatRow}>
          <View style={[styles.dayLabelCol, { width: DAY_LABEL_COL, height: monthRowHeight + gridHeight }]}>
            <View style={{ height: monthRowHeight }} />
            {['M', '', 'W', '', 'F', '', 'S'].map((label, row) => (
              <View
                key={`${label}-${row}`}
                style={{ height: cellSize + cellGap, justifyContent: 'center' }}
              >
                <Text style={styles.dayLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            style={styles.heatScroll}
            contentContainerStyle={styles.heatScrollContent}
          >
            <View>
              <View style={{ height: monthRowHeight }}>
                <Svg width={gridWidth} height={monthRowHeight}>
                  {monthLabels.map((m, i) => (
                    <SvgText
                      key={i}
                      x={m.col * (cellSize + cellGap)}
                      y={monthRowHeight - 5}
                      fontSize={8}
                      fill={COLORS.text_tertiary}
                    >
                      {m.label}
                    </SvgText>
                  ))}
                </Svg>
              </View>
              <Svg width={gridWidth} height={gridHeight}>
                {monthSeparators.map((x, i) => (
                  <Line
                    key={`separator-${i}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={gridHeight}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={1}
                  />
                ))}
                {cells.map((cell, i) => (
                  <Rect
                    key={i}
                    x={cell.col * (cellSize + cellGap)}
                    y={cell.row * (cellSize + cellGap)}
                    width={cellSize}
                    height={cellSize}
                    rx={2}
                    fill={getCellColor(cell.count)}
                    stroke={cell.date === todayDateKey ? COLORS.text_primary : undefined}
                    strokeWidth={cell.date === todayDateKey ? 1 : 0}
                  />
                ))}
              </Svg>
            </View>
          </ScrollView>
        </View>

        <View style={styles.heatLegend}>
          <Text style={styles.heatLegendText}>Less</Text>
          {[0, 1, 2, 3].map((count) => (
            <View
              key={count}
              style={[styles.heatLegendCell, { backgroundColor: getCellColor(count) }]}
            />
          ))}
          <Text style={styles.heatLegendText}>More</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  statLabel: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    color: COLORS.text_primary,
    fontSize: 20,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.xl,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  chartHeaderText: {
    flex: 1,
  },
  chartTitle: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  chartSummary: {
    color: COLORS.text_secondary,
    fontSize: 12,
    lineHeight: 16,
  },
  chartBadge: {
    minWidth: 64,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg_elevated,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    alignItems: 'center',
  },
  chartBadgeValue: {
    color: COLORS.accent_light,
    fontSize: 16,
    fontWeight: '700',
  },
  chartBadgeLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
  },
  chartHint: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
  },
  heatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: '#17171B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  dayLabelCol: {
    marginRight: SPACING.sm,
  },
  heatScroll: {
    flex: 1,
  },
  heatScrollContent: {
    paddingRight: SPACING.sm,
  },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: SPACING.sm,
  },
  heatLegendText: {
    color: COLORS.text_tertiary,
    fontSize: 9,
  },
  heatLegendCell: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
  dayLabel: {
    color: COLORS.text_tertiary,
    fontSize: 8,
  },
});
