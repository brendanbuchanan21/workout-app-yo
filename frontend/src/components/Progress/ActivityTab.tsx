import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface ActivityDay {
  count: number;
  labels: string[];
}

interface ActivityTabProps {
  activity: Record<string, ActivityDay>;
}

const screenWidth = Dimensions.get('window').width;

export default function ActivityTab({ activity }: ActivityTabProps) {
  const today = new Date();
  const totalWeeks = 52;
  const cellSize = Math.floor((screenWidth - SPACING.xl * 2 - 30) / totalWeeks) - 1;
  const cellGap = 1;

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (totalWeeks * 7));
  const dayOfWeek = startDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + mondayOffset);

  const cells: { date: string; count: number; col: number; row: number }[] = [];
  const monthLabels: { label: string; col: number }[] = [];
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

  const svgWidth = totalWeeks * (cellSize + cellGap);
  const svgHeight = 7 * (cellSize + cellGap) + 15;

  function getCellColor(count: number): string {
    if (count === 0) return COLORS.bg_elevated;
    if (count === 1) return 'rgba(232, 145, 45, 0.3)';
    if (count === 2) return 'rgba(232, 145, 45, 0.55)';
    return COLORS.accent_primary;
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
        <Text style={styles.chartTitle}>Workout Activity</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={{ height: 14, marginLeft: 0 }}>
              <Svg width={svgWidth} height={14}>
                {monthLabels.map((m, i) => (
                  <SvgText
                    key={i}
                    x={m.col * (cellSize + cellGap)}
                    y={10}
                    fontSize={8}
                    fill={COLORS.text_tertiary}
                  >
                    {m.label}
                  </SvgText>
                ))}
              </Svg>
            </View>
            <Svg width={svgWidth} height={7 * (cellSize + cellGap)}>
              {cells.map((cell, i) => (
                <Rect
                  key={i}
                  x={cell.col * (cellSize + cellGap)}
                  y={cell.row * (cellSize + cellGap)}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={getCellColor(cell.count)}
                />
              ))}
            </Svg>
          </View>
        </ScrollView>

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

      <View style={styles.dayLabels}>
        {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((label, i) => (
          <Text key={i} style={styles.dayLabel}>{label}</Text>
        ))}
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
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  chartTitle: {
    color: COLORS.text_secondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: SPACING.md,
  },
  heatLegendText: {
    color: COLORS.text_tertiary,
    fontSize: 9,
  },
  heatLegendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  dayLabels: {
    position: 'absolute',
    left: SPACING.xl,
    top: 0,
    display: 'none',
  },
  dayLabel: {
    color: COLORS.text_tertiary,
    fontSize: 8,
  },
});
