import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface WeightEntry {
  date: string;
  weight: number;
}

interface WeightTabProps {
  entries: WeightEntry[];
  newWeight: string;
  setNewWeight: (value: string) => void;
  handleLogWeight: () => void;
}

const screenWidth = Dimensions.get('window').width;

export default function WeightTab({ entries, newWeight, setNewWeight, handleLogWeight }: WeightTabProps) {
  const chartWidth = screenWidth - SPACING.xl * 2 - SPACING.lg * 2;
  const chartHeight = 150;
  const chartPadding = { top: 10, right: 10, bottom: 20, left: 40 };
  const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  const weights = entries.map((e) => e.weight);
  const minW = weights.length > 0 ? Math.min(...weights) - 1 : 0;
  const maxW = weights.length > 0 ? Math.max(...weights) + 1 : 1;

  const weightPoints = entries.length > 1
    ? entries
        .map((e, i) => {
          const x = chartPadding.left + (i / (entries.length - 1)) * innerWidth;
          const y = chartPadding.top + (1 - (e.weight - minW) / (maxW - minW)) * innerHeight;
          return `${x},${y}`;
        })
        .join(' ')
    : '';

  const latestWeight = entries.length > 0 ? entries[entries.length - 1].weight : null;
  const weekAgoWeight = entries.length >= 7 ? entries[entries.length - 7].weight : null;
  const weeklyChange = latestWeight && weekAgoWeight ? latestWeight - weekAgoWeight : null;

  return (
    <>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statValue}>{latestWeight ? `${latestWeight} lbs` : '--'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>7-Day Change</Text>
          <Text style={[styles.statValue, weeklyChange !== null && weeklyChange < 0 ? { color: COLORS.success } : {}]}>
            {weeklyChange !== null ? `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} lbs` : '--'}
          </Text>
        </View>
      </View>

      {entries.length > 1 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Body Weight (last {entries.length} days)</Text>
          <Svg width={chartWidth} height={chartHeight}>
            {[minW, (minW + maxW) / 2, maxW].map((w, i) => {
              const y = chartPadding.top + (1 - (w - minW) / (maxW - minW)) * innerHeight;
              return (
                <Line
                  key={i}
                  x1={chartPadding.left}
                  y1={y}
                  x2={chartWidth - chartPadding.right}
                  y2={y}
                  stroke={COLORS.border_subtle}
                  strokeWidth={1}
                />
              );
            })}
            {[minW, maxW].map((w, i) => {
              const y = chartPadding.top + (1 - (w - minW) / (maxW - minW)) * innerHeight;
              return (
                <SvgText
                  key={i}
                  x={chartPadding.left - 4}
                  y={y + 4}
                  fontSize={9}
                  fill={COLORS.text_tertiary}
                  textAnchor="end"
                >
                  {w.toFixed(0)}
                </SvgText>
              );
            })}
            <Polyline
              points={weightPoints}
              fill="none"
              stroke={COLORS.accent_primary}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      )}

      <View style={styles.logSection}>
        <Text style={styles.logTitle}>Log Today's Weight</Text>
        <View style={styles.logRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Weight (lbs)"
            placeholderTextColor={COLORS.text_tertiary}
            value={newWeight}
            onChangeText={setNewWeight}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.logButton} onPress={handleLogWeight}>
            <Text style={styles.logButtonText}>Log</Text>
          </TouchableOpacity>
        </View>
      </View>

      {entries.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          {[...entries].reverse().slice(0, 7).map((entry) => (
            <View key={entry.date} style={styles.entryRow}>
              <Text style={styles.entryDate}>
                {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              <Text style={styles.entryWeight}>{entry.weight} lbs</Text>
            </View>
          ))}
        </>
      )}

      {entries.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Weight Entries</Text>
          <Text style={styles.emptyText}>Log your body weight to start tracking trends.</Text>
        </View>
      )}
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
  sectionTitle: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyTitle: {
    color: COLORS.text_primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  logSection: {
    marginBottom: SPACING.xl,
  },
  logTitle: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  logRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text_primary,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  logButton: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xxl,
    justifyContent: 'center',
  },
  logButtonText: {
    color: COLORS.text_on_accent,
    fontSize: 15,
    fontWeight: '700',
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border_subtle,
  },
  entryDate: {
    color: COLORS.text_secondary,
    fontSize: 13,
  },
  entryWeight: {
    color: COLORS.text_primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
