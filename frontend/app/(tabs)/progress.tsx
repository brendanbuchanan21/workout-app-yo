import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

interface WeightEntry {
  date: string;
  weight: number; // displayed weight (lbs or kg)
}

export default function Progress() {
  const [entries, setEntries] = useState<WeightEntry[]>([
    // Mock data
    { date: '2026-03-01', weight: 192.4 },
    { date: '2026-03-02', weight: 191.8 },
    { date: '2026-03-03', weight: 192.6 },
    { date: '2026-03-04', weight: 191.2 },
    { date: '2026-03-05', weight: 190.8 },
    { date: '2026-03-06', weight: 191.0 },
    { date: '2026-03-07', weight: 190.4 },
    { date: '2026-03-08', weight: 190.2 },
    { date: '2026-03-09', weight: 190.6 },
    { date: '2026-03-10', weight: 189.8 },
  ]);
  const [newWeight, setNewWeight] = useState('');

  const handleLogWeight = () => {
    const w = parseFloat(newWeight);
    if (isNaN(w) || w <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    setEntries([...entries.filter((e) => e.date !== today), { date: today, weight: w }]);
    setNewWeight('');
  };

  // Simple chart
  const chartWidth = 320;
  const chartHeight = 150;
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const weights = entries.map((e) => e.weight);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;

  const points = entries
    .map((e, i) => {
      const x = padding.left + (i / (entries.length - 1)) * innerWidth;
      const y = padding.top + (1 - (e.weight - minW) / (maxW - minW)) * innerHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const latestWeight = entries.length > 0 ? entries[entries.length - 1].weight : null;
  const weekAgoWeight = entries.length >= 7 ? entries[entries.length - 7].weight : null;
  const weeklyChange = latestWeight && weekAgoWeight ? latestWeight - weekAgoWeight : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.screenTitle}>Progress</Text>

        {/* Current stats */}
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

        {/* Weight chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Body Weight (last {entries.length} days)</Text>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Grid lines */}
            {[minW, (minW + maxW) / 2, maxW].map((w, i) => {
              const y = padding.top + (1 - (w - minW) / (maxW - minW)) * innerHeight;
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
            {[minW, maxW].map((w, i) => {
              const y = padding.top + (1 - (w - minW) / (maxW - minW)) * innerHeight;
              return (
                <SvgText
                  key={i}
                  x={padding.left - 4}
                  y={y + 4}
                  fontSize={9}
                  fill={COLORS.text_tertiary}
                  textAnchor="end"
                >
                  {w.toFixed(0)}
                </SvgText>
              );
            })}
            {/* Line */}
            <Polyline
              points={points}
              fill="none"
              stroke={COLORS.accent_primary}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        {/* Log weight */}
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

        {/* Recent entries */}
        <Text style={styles.sectionTitle}>Recent Entries</Text>
        {[...entries].reverse().slice(0, 7).map((entry) => (
          <View key={entry.date} style={styles.entryRow}>
            <Text style={styles.entryDate}>{entry.date}</Text>
            <Text style={styles.entryWeight}>{entry.weight} lbs</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg_primary,
  },
  scroll: {
    padding: SPACING.xl,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text_primary,
    marginBottom: SPACING.xl,
  },
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
  sectionTitle: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
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
