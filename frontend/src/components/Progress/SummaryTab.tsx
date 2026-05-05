import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { EnrichedExerciseHistory } from '../../types/training';
import { ExerciseProgression } from '../../utils/progressionInsights';
import ProgressionBadge from './ProgressionBadge';

interface SummaryTabProps {
  onViewDetail?: (catalogId: string, exerciseName: string) => void;
}

interface ProgressionResponse {
  progressions: ExerciseProgression[];
  phaseIntent: string | null;
}

interface ExerciseSignal extends EnrichedExerciseHistory {
  currentE1rm: number;
  peakE1rm: number;
  startE1rm: number;
  changePercent: number;
  progression?: ExerciseProgression;
}

const screenWidth = Dimensions.get('window').width;

function formatWeight(kg: number): string {
  return `${Math.round(kg * 2.20462)} lbs`;
}

function formatPercent(value: number): string {
  if (Math.abs(value) < 0.1) return 'Flat';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function computeSignals(
  exercises: EnrichedExerciseHistory[],
  progressions: ExerciseProgression[],
): ExerciseSignal[] {
  const progressionMap = new Map<string, ExerciseProgression>();
  for (const progression of progressions) {
    progressionMap.set(progression.catalogId || progression.exerciseName, progression);
  }

  return exercises
    .filter((exercise) => exercise.history.length >= 2)
    .map((exercise) => {
      const current = exercise.history[exercise.history.length - 1];
      const start = exercise.history[0];
      const peak = exercise.history.reduce(
        (best, item) => item.e1rmKg > best.e1rmKg ? item : best,
        exercise.history[0],
      );
      const progression = progressionMap.get(exercise.catalogId || exercise.exerciseName);
      const changePercent = start.e1rmKg > 0
        ? ((current.e1rmKg - start.e1rmKg) / start.e1rmKg) * 100
        : 0;

      return {
        ...exercise,
        currentE1rm: current.e1rmKg,
        peakE1rm: peak.e1rmKg,
        startE1rm: start.e1rmKg,
        changePercent,
        progression,
      };
    });
}

function getCardTone(signal: ExerciseSignal): 'success' | 'warning' | 'neutral' {
  if (signal.progression?.status === 'regressing') return 'warning';
  if (signal.progression?.status === 'progressing') return 'success';
  if (signal.changePercent < -3) return 'warning';
  if (signal.changePercent > 3) return 'success';
  return 'neutral';
}

function getSignalLine(signal: ExerciseSignal): string {
  const status = signal.progression?.status;
  if (status === 'regressing') return 'Performance is trending down across recent sessions.';
  if (status === 'stalled') return 'Performance is mostly flat across recent sessions.';
  if (status === 'progressing') return 'Recent sessions are moving in the right direction.';
  if (signal.changePercent > 3) return 'Estimated strength is up across this window.';
  if (signal.changePercent < -3) return 'Estimated strength is down across this window.';
  return 'Estimated strength is mostly unchanged.';
}

function renderSparkline(signal: ExerciseSignal, tone: 'success' | 'warning' | 'neutral') {
  const width = screenWidth - SPACING.xl * 2 - SPACING.lg * 2;
  const height = 56;
  const values = signal.history.map((point) => point.e1rmKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pointList = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = 8 + (1 - (value - min) / range) * (height - 16);
      return { x, y };
    });
  const points = pointList.map((point) => `${point.x},${point.y}`).join(' ');
  const baselineY = height - 6;
  const areaPoints = pointList.length > 1
    ? `${pointList[0].x},${baselineY} ${points} ${pointList[pointList.length - 1].x},${baselineY}`
    : '';
  const color = tone === 'warning'
    ? '#E2A83C'
    : tone === 'success'
      ? '#2FB861'
      : COLORS.accent_light;
  const fillId = `summarySpark${signal.catalogId || signal.exerciseName}`.replace(/[^a-zA-Z0-9]/g, '');

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.14" />
          <Stop offset="0.55" stopColor={color} stopOpacity="0.06" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {areaPoints.length > 0 && (
        <Polygon
          points={areaPoints}
          fill={`url(#${fillId})`}
        />
      )}
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.88}
      />
    </Svg>
  );
}

function SignalCard({
  signal,
  label,
  phaseIntent,
  featured = false,
  onViewDetail,
}: {
  signal: ExerciseSignal;
  label?: string;
  phaseIntent: string | null;
  featured?: boolean;
  onViewDetail?: (catalogId: string, exerciseName: string) => void;
}) {
  const tone = getCardTone(signal);
  const toneColor = tone === 'warning'
    ? COLORS.warning
    : tone === 'success'
      ? COLORS.success
      : COLORS.accent_primary;

  return (
    <TouchableOpacity
      style={[styles.card, featured && styles.featuredCard]}
      activeOpacity={0.78}
      onPress={() => {
        if (signal.catalogId && onViewDetail) onViewDetail(signal.catalogId, signal.exerciseName);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          {label ? <Text style={styles.cardKicker}>{label}</Text> : null}
          <View style={styles.nameRow}>
            <Text style={styles.exerciseName} numberOfLines={1}>{signal.exerciseName}</Text>
            {signal.progression ? (
              <ProgressionBadge status={signal.progression.status} phaseIntent={phaseIntent} />
            ) : null}
          </View>
          <Text style={styles.signalLine}>{getSignalLine(signal)}</Text>
        </View>
        <View style={styles.changeWrap}>
          <Text style={[styles.changeValue, { color: toneColor }]}>
            {formatPercent(signal.progression?.e1rmChangePercent || signal.changePercent)}
          </Text>
          <Ionicons
            name={tone === 'warning' ? 'trending-down' : tone === 'success' ? 'trending-up' : 'remove'}
            size={16}
            color={toneColor}
          />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statValue}>{formatWeight(signal.currentE1rm)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Peak</Text>
          <Text style={styles.statValue}>{formatWeight(signal.peakE1rm)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Sessions</Text>
          <Text style={styles.statValue}>{signal.history.length}</Text>
        </View>
      </View>

      <View style={styles.sparkWrap}>
        {renderSparkline(signal, tone)}
      </View>

      <View style={styles.thenNowRow}>
        <Text style={styles.thenNowText}>
          Then {formatWeight(signal.startE1rm)} to now {formatWeight(signal.currentE1rm)}
        </Text>
        <Text style={[styles.thenNowDelta, { color: toneColor }]}>
          {formatPercent(signal.changePercent)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function SummaryTab({ onViewDetail }: SummaryTabProps) {
  const historyQuery = useQuery({
    queryKey: ['training', 'exercise-history'],
    queryFn: async () => {
      const res = await apiGet('/training/exercise-history');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.exercises || []) as EnrichedExerciseHistory[];
    },
  });

  const progressionQuery = useQuery<ProgressionResponse>({
    queryKey: ['training', 'progression-status'],
    queryFn: async () => {
      const res = await apiGet('/training/progression/status');
      if (!res.ok) return { progressions: [], phaseIntent: null };
      return (await res.json()) as ProgressionResponse;
    },
  });

  const phaseIntent = progressionQuery.data?.phaseIntent ?? null;
  const signals = useMemo(
    () => computeSignals(historyQuery.data ?? [], progressionQuery.data?.progressions ?? []),
    [historyQuery.data, progressionQuery.data],
  );

  const attention = signals
    .filter((signal) => signal.progression?.status === 'regressing' || signal.changePercent < -3)
    .sort((a, b) => Math.abs(b.progression?.e1rmChangePercent || b.changePercent) - Math.abs(a.progression?.e1rmChangePercent || a.changePercent));
  const movingWell = signals
    .filter((signal) => signal.progression?.status === 'progressing' || signal.changePercent > 3)
    .sort((a, b) => (b.progression?.e1rmChangePercent || b.changePercent) - (a.progression?.e1rmChangePercent || a.changePercent));
  const biggestSignal = [...attention, ...movingWell]
    .sort((a, b) => Math.abs(b.progression?.e1rmChangePercent || b.changePercent) - Math.abs(a.progression?.e1rmChangePercent || a.changePercent))[0]
    || signals.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0];

  if (historyQuery.isLoading || progressionQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.accent_primary} />
      </View>
    );
  }

  if (!biggestSignal) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No progress signals yet</Text>
        <Text style={styles.emptyText}>Complete a few workouts to build exercise trends.</Text>
      </View>
    );
  }

  return (
    <View>
      <Section title="Biggest Signal">
        <SignalCard
          signal={biggestSignal}
          label="Exercise story"
          phaseIntent={phaseIntent}
          featured
          onViewDetail={onViewDetail}
        />
      </Section>

      {attention.length > 0 ? (
        <Section title="Needs Attention">
          {attention.slice(0, 2).map((signal) => (
            <SignalCard
              key={signal.catalogId || signal.exerciseName}
              signal={signal}
              phaseIntent={phaseIntent}
              onViewDetail={onViewDetail}
            />
          ))}
        </Section>
      ) : null}

      {movingWell.length > 0 ? (
        <Section title="Moving Well">
          {movingWell
            .filter((signal) => (signal.catalogId || signal.exerciseName) !== (biggestSignal.catalogId || biggestSignal.exerciseName))
            .slice(0, 3)
            .map((signal) => (
              <SignalCard
                key={signal.catalogId || signal.exerciseName}
                signal={signal}
                phaseIntent={phaseIntent}
                onViewDetail={onViewDetail}
              />
            ))}
        </Section>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: SPACING.xxxl * 2,
    alignItems: 'center',
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
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  featuredCard: {
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardKicker: {
    color: COLORS.accent_primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  exerciseName: {
    color: COLORS.text_primary,
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
  },
  signalLine: {
    color: COLORS.text_secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  changeWrap: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    paddingTop: 2,
  },
  changeValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  statLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '800',
  },
  sparkWrap: {
    marginTop: SPACING.md,
    alignItems: 'center',
    overflow: 'hidden',
  },
  thenNowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    gap: SPACING.md,
  },
  thenNowText: {
    color: COLORS.text_secondary,
    fontSize: 13,
    flex: 1,
  },
  thenNowDelta: {
    fontSize: 14,
    fontWeight: '800',
  },
});
