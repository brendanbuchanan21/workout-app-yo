import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface ExerciseHistoryPoint {
  date: string;
  bestWeightKg: number;
  bestReps: number;
  e1rmKg: number;
}

interface ExerciseHistory {
  exerciseName: string;
  catalogId: string | null;
  history: ExerciseHistoryPoint[];
}

interface StrengthTabProps {
  exerciseHistories: ExerciseHistory[];
  expandedExercise: string | null;
  setExpandedExercise: (key: string | null) => void;
}

function formatWeight(kg: number): string {
  return `${Math.round(kg * 2.20462)} lbs`;
}

const screenWidth = Dimensions.get('window').width;

function renderE1rmChart(ex: ExerciseHistory) {
  const chartWidth = screenWidth - SPACING.xl * 2 - SPACING.lg * 2;
  const chartHeight = 140;
  const padding = { top: 10, right: 10, bottom: 20, left: 45 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const e1rms = ex.history.map((h) => h.e1rmKg);
  const minE = Math.min(...e1rms) * 0.95;
  const maxE = Math.max(...e1rms) * 1.05;
  const range = maxE - minE || 1;

  const points = ex.history
    .map((h, i) => {
      const x = padding.left + (i / Math.max(ex.history.length - 1, 1)) * innerW;
      const y = padding.top + (1 - (h.e1rmKg - minE) / range) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={{ alignItems: 'center', marginTop: SPACING.sm }}>
      <Svg width={chartWidth} height={chartHeight}>
        {[0, 0.5, 1].map((frac, i) => {
          const y = padding.top + (1 - frac) * innerH;
          const val = minE + frac * range;
          return [
            <Line key={`l${i}`} x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke={COLORS.border_subtle} strokeWidth={1} />,
            <SvgText key={`t${i}`} x={padding.left - 4} y={y + 4} fontSize={9} fill={COLORS.text_tertiary} textAnchor="end">
              {Math.round(val * 2.20462)}
            </SvgText>,
          ];
        })}
        {ex.history.length > 0 && (
          <>
            <SvgText
              x={padding.left}
              y={chartHeight - 2}
              fontSize={8}
              fill={COLORS.text_tertiary}
              textAnchor="start"
            >
              {ex.history[0].date.slice(5)}
            </SvgText>
            <SvgText
              x={chartWidth - padding.right}
              y={chartHeight - 2}
              fontSize={8}
              fill={COLORS.text_tertiary}
              textAnchor="end"
            >
              {ex.history[ex.history.length - 1].date.slice(5)}
            </SvgText>
          </>
        )}
        <Polyline
          points={points}
          fill="none"
          stroke={COLORS.accent_primary}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export default function StrengthTab({ exerciseHistories, expandedExercise, setExpandedExercise }: StrengthTabProps) {
  if (exerciseHistories.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No Strength Data</Text>
        <Text style={styles.emptyText}>Complete workouts to see your estimated 1RM and exercise progression.</Text>
      </View>
    );
  }

  const topE1rms = exerciseHistories
    .map((ex) => {
      const latest = ex.history[ex.history.length - 1];
      const peak = ex.history.reduce((max, h) => h.e1rmKg > max.e1rmKg ? h : max, ex.history[0]);
      return {
        ...ex,
        latestE1rm: latest.e1rmKg,
        peakE1rm: peak.e1rmKg,
        trending: ex.history.length >= 2
          ? latest.e1rmKg - ex.history[ex.history.length - 2].e1rmKg
          : 0,
      };
    })
    .sort((a, b) => b.peakE1rm - a.peakE1rm);

  return (
    <>
      <Text style={styles.chartSubtitle}>Estimated 1RM per exercise (Epley formula)</Text>

      {topE1rms.map((ex) => {
        const key = ex.catalogId || ex.exerciseName;
        const isExpanded = expandedExercise === key;

        return (
          <TouchableOpacity
            key={key}
            style={styles.prCard}
            onPress={() => setExpandedExercise(isExpanded ? null : key)}
            activeOpacity={0.7}
          >
            <View style={styles.prCardHeader}>
              <View style={styles.prCardInfo}>
                <Text style={styles.prCardName}>{ex.exerciseName}</Text>
                <Text style={styles.prCardMeta}>
                  {ex.history.length} session{ex.history.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.prCardBest}>
                <Text style={styles.prCardWeight}>{formatWeight(ex.latestE1rm)}</Text>
                {ex.trending !== 0 && (
                  <Text style={[
                    styles.e1rmTrend,
                    { color: ex.trending > 0 ? COLORS.success : COLORS.danger },
                  ]}>
                    {ex.trending > 0 ? '+' : ''}{formatWeight(Math.abs(ex.trending))}
                  </Text>
                )}
              </View>
            </View>

            {isExpanded && (
              <View style={styles.prCardExpanded}>
                {ex.history.length > 1 && renderE1rmChart(ex)}

                <Text style={[styles.strengthHistoryLabel, { marginTop: SPACING.md }]}>Session History</Text>
                {[...ex.history].reverse().slice(0, 10).map((h, i) => (
                  <View key={i} style={styles.prRecordRow}>
                    <Text style={styles.prRecordDate}>
                      {new Date(h.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                    <Text style={styles.prRecordWeight}>
                      {formatWeight(h.bestWeightKg)} x {h.bestReps}
                    </Text>
                    <Text style={styles.prRecordReps}>
                      e1RM: {formatWeight(h.e1rmKg)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
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
  chartSubtitle: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    marginBottom: SPACING.md,
    marginTop: -SPACING.sm,
  },
  prCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  prCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prCardInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  prCardName: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '600',
  },
  prCardMeta: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    marginTop: 2,
  },
  prCardBest: {
    alignItems: 'flex-end',
  },
  prCardWeight: {
    color: COLORS.accent_primary,
    fontSize: 18,
    fontWeight: '700',
  },
  prCardExpanded: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  prRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border_subtle,
  },
  prRecordWeight: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    width: 90,
  },
  prRecordReps: {
    color: COLORS.accent_primary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  prRecordDate: {
    color: COLORS.text_tertiary,
    fontSize: 12,
  },
  e1rmTrend: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  strengthHistoryLabel: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
