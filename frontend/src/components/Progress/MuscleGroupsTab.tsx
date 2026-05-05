import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
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

import { apiGet } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { ALL_MUSCLE_GROUPS, MUSCLE_LABELS } from '../../constants/training';
import { ExerciseProgression } from '../../utils/progressionInsights';
import { EnrichedExerciseHistory, ExerciseHistoryPoint, PREvent } from '../../types/training';

interface VolumeData {
  sets: number;
  tonnageKg: number;
}

interface VolumeWeek {
  weekStart: string;
  muscles: Record<string, number>;
}

interface MuscleGroupComparison {
  muscle: string;
  current: VolumeData | null;
  previous: VolumeData | null;
}

interface Guardrail {
  floor: number;
  ceiling: number;
}

interface MuscleGroupsTabProps {
  muscleGroups: MuscleGroupComparison[];
}

interface ProgressionResponse {
  progressions: ExerciseProgression[];
  phaseIntent: string | null;
}

interface MuscleRow {
  muscle: string;
  label: string;
  currentSets: number;
  previousSets: number;
  volumeDelta: number;
  guardrail?: Guardrail;
  progressing: number;
  stalled: number;
  regressing: number;
  recentPrs: number;
  topSignal?: ExerciseProgression;
  status: 'strong' | 'watch' | 'steady';
}

type ChartMode = 'volume' | 'strength';
type ChartRange = '1m' | '3m' | '6m';

const MUSCLE_CARD_ORDER = [
  'chest',
  'back',
  'quads',
  'hamstrings',
  'side_delts',
  'rear_delts',
  'front_delts',
  'abs',
  'calves',
  'biceps',
  'triceps',
  'glutes',
  'traps',
];

const MUSCLE_CARD_ORDER_INDEX = new Map(
  MUSCLE_CARD_ORDER.map((muscle, index) => [muscle, index]),
);

const CHART_MODES: { value: ChartMode; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'volume', label: 'Volume' },
];

const CHART_RANGES: { value: ChartRange; label: string; months: number }[] = [
  { value: '1m', label: '1M', months: 1 },
  { value: '3m', label: '3M', months: 3 },
  { value: '6m', label: '6M', months: 6 },
];

const screenWidth = Dimensions.get('window').width;

function formatPercent(value: number): string {
  if (Math.abs(value) < 1) return 'flat';
  return `${value > 0 ? '+' : ''}${Math.round(value)}%`;
}

function getCutoffDate(range: ChartRange): Date {
  const option = CHART_RANGES.find((item) => item.value === range);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - (option?.months ?? 3));
  return cutoff;
}

function getPointDate(date: string): Date {
  return new Date(`${date.split('T')[0]}T12:00:00`);
}

function getRecentPrCount(events: PREvent[], muscle: string): number {
  const today = new Date();
  return events.filter((event) => {
    if (event.primaryMuscle !== muscle) return false;
    const date = new Date(`${event.date.split('T')[0]}T12:00:00`);
    const daysAgo = (today.getTime() - date.getTime()) / 86400000;
    return daysAgo >= 0 && daysAgo <= 30;
  }).length;
}

function getVolumeLabel(row: MuscleRow): string {
  if (!row.guardrail) return `${row.currentSets} sets this week`;
  if (row.currentSets < row.guardrail.floor) {
    return `${row.currentSets} sets/wk, below ${row.guardrail.floor}-${row.guardrail.ceiling}`;
  }
  if (row.currentSets > row.guardrail.ceiling) {
    return `${row.currentSets} sets/wk, above ${row.guardrail.floor}-${row.guardrail.ceiling}`;
  }
  return `${row.currentSets} sets/wk, in ${row.guardrail.floor}-${row.guardrail.ceiling} range`;
}

function getStatus(row: Omit<MuscleRow, 'status' | 'label'>): MuscleRow['status'] {
  const belowRange = row.guardrail ? row.currentSets < row.guardrail.floor : false;
  const aboveRange = row.guardrail ? row.currentSets > row.guardrail.ceiling : false;
  if (row.regressing > row.progressing || belowRange || aboveRange) return 'watch';
  if (row.progressing > 0 || row.recentPrs > 0) return 'strong';
  return 'steady';
}

function getVolumeSummary(row: MuscleRow): string {
  const rangeCopy = getVolumeLabel(row);
  const trendCopy = `Volume ${formatPercent(row.volumeDelta)} vs previous week.`;
  return `${rangeCopy}. ${trendCopy}`;
}

function getStrengthSummary(row: MuscleRow, exercise?: EnrichedExerciseHistory, pointCount = 0): string {
  if (!exercise || pointCount === 0) {
    return `No strength timeline yet. ${row.progressing} improving · ${row.stalled} flat · ${row.regressing} down.`;
  }

  const signal = row.topSignal
    ? `${row.topSignal.exerciseName} ${formatPercent(row.topSignal.e1rmChangePercent)}`
    : exercise.exerciseName;
  return `Best signal: ${signal}. ${pointCount} session${pointCount !== 1 ? 's' : ''} shown.`;
}

function getRepresentativeExercise(
  row: MuscleRow,
  exercises: EnrichedExerciseHistory[],
): EnrichedExerciseHistory | undefined {
  const muscleExercises = exercises.filter((exercise) => exercise.primaryMuscle === row.muscle);
  if (muscleExercises.length === 0) return undefined;

  if (row.topSignal) {
    const signalExercise = muscleExercises.find((exercise) =>
      (row.topSignal?.catalogId && exercise.catalogId === row.topSignal.catalogId)
      || exercise.exerciseName === row.topSignal?.exerciseName
    );
    if (signalExercise) return signalExercise;
  }

  return [...muscleExercises].sort((a, b) => {
    const aLatest = a.history[a.history.length - 1]?.date ?? '';
    const bLatest = b.history[b.history.length - 1]?.date ?? '';
    return b.history.length - a.history.length || bLatest.localeCompare(aLatest);
  })[0];
}

function CompactLineChart({
  values,
  labels,
  readoutLabels,
  ySuffix,
  guardrail,
  emptyText,
}: {
  values: number[];
  labels: string[];
  readoutLabels: string[];
  ySuffix: string;
  guardrail?: Guardrail;
  emptyText: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartWidth = screenWidth - SPACING.xl * 2 - SPACING.lg * 2 - 2;
  const chartHeight = 180;
  const padding = { top: 20, right: 14, bottom: 34, left: 43 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;
  const dataMax = values.reduce((max, value) => Math.max(max, value), 0);
  const rawMax = Math.max(dataMax, guardrail?.ceiling ?? 0, 1);
  const niceStep = rawMax <= 10 ? 2 : rawMax <= 30 ? 5 : rawMax <= 100 ? 20 : 50;
  const maxY = Math.ceil((rawMax * 1.08) / niceStep) * niceStep;

  const xFor = (index: number) => padding.left + (index / Math.max(values.length - 1, 1)) * innerW;
  const yFor = (value: number) => padding.top + (1 - value / maxY) * innerH;
  const points = values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(' ');
  const lastIndex = values.length - 1;
  const baselineY = yFor(0);
  const areaPoints = values.length > 1
    ? `${padding.left},${baselineY} ${points} ${xFor(lastIndex)},${baselineY}`
    : '';
  const activePoint = activeIndex !== null
    ? { x: xFor(activeIndex), y: yFor(values[activeIndex]), value: values[activeIndex] }
    : null;

  const setActiveFromX = (locationX: number) => {
    const boundedX = Math.max(padding.left, Math.min(locationX, chartWidth - padding.right));
    const nearestIndex = values.reduce((nearest, _, index) => {
      return Math.abs(xFor(index) - boundedX) < Math.abs(xFor(nearest) - boundedX)
        ? index
        : nearest;
    }, 0);
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

  if (values.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartPanel} {...responderHandlers}>
      {activeIndex !== null && (
        <View style={styles.chartReadout}>
          <Text style={styles.chartReadoutValue}>
            {Math.round(values[activeIndex])}{ySuffix}
          </Text>
          <Text style={styles.chartReadoutMeta}>{readoutLabels[activeIndex]}</Text>
        </View>
      )}
      {activeIndex === null && (
        <Text style={styles.chartHint}>Drag chart for details</Text>
      )}
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="muscleChartFill" x1="0" y1="0" x2="0" y2="1">
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

        {Array.from({ length: 13 }).map((_, index) => {
          const x = padding.left + (index / 12) * innerW;
          return (
            <Line
              key={`grid-x-${index}`}
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

        {Array.from({ length: 4 }).map((_, index) => {
          const y = padding.top + (index / 3) * innerH;
          return (
            <Line
              key={`grid-y-${index}`}
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

        {guardrail && (
          <Rect
            x={padding.left}
            y={yFor(guardrail.ceiling)}
            width={innerW}
            height={Math.max(yFor(guardrail.floor) - yFor(guardrail.ceiling), 2)}
            fill={COLORS.accent_subtle}
            opacity={0.45}
          />
        )}

        {[0, maxY].map((value) => (
          <SvgText
            key={`y-${value}`}
            x={padding.left - 5}
            y={yFor(value) + 4}
            fontSize={9}
            fill={COLORS.text_tertiary}
            textAnchor="end"
            opacity={0.75}
          >
            {value === maxY ? `${Math.round(value)}${ySuffix}` : '0'}
          </SvgText>
        ))}

        {areaPoints.length > 0 && (
          <Polygon
            points={areaPoints}
            fill="url(#muscleChartFill)"
          />
        )}

        <Polyline
          points={points}
          fill="none"
          stroke={COLORS.accent_primary}
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {labels.map((label, index) => {
          const x = labels.length === 1
            ? padding.left
            : padding.left + (index / (labels.length - 1)) * innerW;
          return (
            <SvgText
              key={`label-${index}`}
              x={x}
              y={chartHeight - 5}
              fontSize={9}
              fill={COLORS.text_tertiary}
              opacity={0.8}
              textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'}
            >
              {label}
            </SvgText>
          );
        })}

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
  );
}

function formatChartDate(date: string): string {
  return getPointDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getChartLabels(dates: string[]): string[] {
  if (dates.length === 0) return [];
  const labelCount = Math.min(3, dates.length);
  return Array.from({ length: labelCount }).map((_, labelIndex) => {
    const pointIndex = labelCount === 1
      ? 0
      : Math.round(labelIndex * (dates.length - 1) / (labelCount - 1));
    const date = getPointDate(dates[pointIndex]);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
}

function buildRows(
  muscleGroups: MuscleGroupComparison[],
  guardrails: Record<string, Guardrail>,
  progressions: ExerciseProgression[],
  prEvents: PREvent[],
): MuscleRow[] {
  const comparisonMap = new Map(muscleGroups.map((item) => [item.muscle, item]));
  const muscleSet = new Set<string>([
    ...ALL_MUSCLE_GROUPS,
    ...muscleGroups.map((item) => item.muscle),
    ...progressions.map((item) => item.muscleGroup),
    ...prEvents.map((item) => item.primaryMuscle),
  ]);

  return Array.from(muscleSet)
    .map((muscle) => {
      const comparison = comparisonMap.get(muscle);
      const currentSets = comparison?.current?.sets || 0;
      const previousSets = comparison?.previous?.sets || 0;
      const muscleProgressions = progressions.filter((item) => item.muscleGroup === muscle);
      const progressing = muscleProgressions.filter((item) => item.status === 'progressing').length;
      const stalled = muscleProgressions.filter((item) => item.status === 'stalled').length;
      const regressing = muscleProgressions.filter((item) => item.status === 'regressing').length;
      const topSignal = [...muscleProgressions].sort(
        (a, b) => Math.abs(b.e1rmChangePercent) - Math.abs(a.e1rmChangePercent),
      )[0];
      const volumeDelta = previousSets > 0
        ? ((currentSets - previousSets) / previousSets) * 100
        : currentSets > 0 ? 100 : 0;
      const baseRow = {
        muscle,
        currentSets,
        previousSets,
        volumeDelta,
        guardrail: guardrails[muscle],
        progressing,
        stalled,
        regressing,
        recentPrs: getRecentPrCount(prEvents, muscle),
        topSignal,
      };

      return {
        ...baseRow,
        label: MUSCLE_LABELS[muscle] || muscle.replace(/_/g, ' '),
        status: getStatus(baseRow),
      };
    })
    .filter((row) =>
      row.currentSets > 0
      || row.previousSets > 0
      || row.progressing > 0
      || row.stalled > 0
      || row.regressing > 0
      || row.recentPrs > 0
    )
    .sort((a, b) => {
      const aOrder = MUSCLE_CARD_ORDER_INDEX.get(a.muscle) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = MUSCLE_CARD_ORDER_INDEX.get(b.muscle) ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;

      const statusOrder = { watch: 0, strong: 1, steady: 2 };
      return statusOrder[a.status] - statusOrder[b.status]
        || b.progressing + b.regressing - (a.progressing + a.regressing)
        || b.currentSets - a.currentSets;
    });
}

function MuscleGroupCard({
  row,
  volumeWeeks,
  exercises,
}: {
  row: MuscleRow;
  volumeWeeks: VolumeWeek[];
  exercises: EnrichedExerciseHistory[];
}) {
  const [mode, setMode] = useState<ChartMode>('strength');
  const [range, setRange] = useState<ChartRange>('3m');
  const statusColor = row.status === 'watch'
    ? COLORS.warning
    : row.status === 'strong'
      ? COLORS.success
      : COLORS.text_secondary;
  const statusBg = row.status === 'watch'
    ? COLORS.warning_subtle
    : row.status === 'strong'
      ? COLORS.success_subtle
      : COLORS.bg_input;
  const statusLabel = row.status === 'watch'
    ? 'Watch'
    : row.status === 'strong'
      ? 'Strong'
      : 'Steady';
  const cutoff = getCutoffDate(range);
  const filteredVolumeWeeks = volumeWeeks.filter((week) => getPointDate(week.weekStart) >= cutoff);
  const volumeValues = filteredVolumeWeeks.map((week) => week.muscles[row.muscle] || 0);
  const volumeLabels = getChartLabels(filteredVolumeWeeks.map((week) => week.weekStart));
  const volumeReadoutLabels = filteredVolumeWeeks.map((week) => formatChartDate(week.weekStart));
  const representativeExercise = getRepresentativeExercise(row, exercises);
  const strengthPoints = (representativeExercise?.history ?? [])
    .filter((point) => getPointDate(point.date) >= cutoff);
  const strengthValues = strengthPoints.map((point: ExerciseHistoryPoint) => Math.round(point.e1rmKg * 2.20462));
  const strengthLabels = getChartLabels(strengthPoints.map((point) => point.date));
  const strengthReadoutLabels = strengthPoints.map((point) => formatChartDate(point.date));
  const summary = mode === 'volume'
    ? getVolumeSummary(row)
    : getStrengthSummary(row, representativeExercise, strengthPoints.length);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.muscleName}>{row.label}</Text>
          <Text style={styles.summaryText}>
            {row.progressing} improving · {row.stalled} flat · {row.regressing} down
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.controlRow}>
        <View style={styles.segmentGroup}>
          {CHART_MODES.map((option) => {
            const active = option.value === mode;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => setMode(option.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.rangeGroup}>
          {CHART_RANGES.map((option) => {
            const active = option.value === range;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => setRange(option.value)}
                activeOpacity={0.75}
                hitSlop={8}
              >
                <Text style={[styles.rangeText, active && styles.rangeTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {mode === 'volume' ? (
        <CompactLineChart
          values={volumeValues}
          labels={volumeLabels}
          readoutLabels={volumeReadoutLabels}
          ySuffix=" sets"
          guardrail={row.guardrail}
          emptyText="No volume logged in this range"
        />
      ) : (
        <CompactLineChart
          values={strengthValues}
          labels={strengthLabels}
          readoutLabels={strengthReadoutLabels}
          ySuffix=" lb"
          emptyText="No strength trend in this range"
        />
      )}

      <View style={styles.summaryRow}>
        <Ionicons
          name={mode === 'volume'
            ? row.volumeDelta < -5 ? 'trending-down' : row.volumeDelta > 5 ? 'trending-up' : 'remove'
            : row.regressing > row.progressing ? 'trending-down' : row.progressing > 0 ? 'trending-up' : 'remove'}
          size={15}
          color={row.status === 'watch' ? COLORS.warning : row.status === 'strong' ? COLORS.success : COLORS.text_tertiary}
        />
        <Text style={styles.contextText}>{summary}</Text>
      </View>
    </View>
  );
}

export default function MuscleGroupsTab({ muscleGroups }: MuscleGroupsTabProps) {
  const guardrailsQuery = useQuery({
    queryKey: ['training', 'volume-guardrails'],
    queryFn: async () => {
      const res = await apiGet('/training/volume-guardrails');
      if (!res.ok) return {} as Record<string, Guardrail>;
      const data = await res.json();
      return (data.guardrails || {}) as Record<string, Guardrail>;
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

  const prFeedQuery = useQuery({
    queryKey: ['training', 'prs', 'feed'],
    queryFn: async () => {
      const res = await apiGet('/training/prs/feed');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.prEvents || []) as PREvent[];
    },
  });

  const volumeHistoryQuery = useQuery({
    queryKey: ['training', 'volume-history', '6m'],
    queryFn: async () => {
      const res = await apiGet('/training/volume-history?range=6m');
      if (!res.ok) return [] as VolumeWeek[];
      const data = await res.json();
      return (data.weeks || []) as VolumeWeek[];
    },
  });

  const exerciseHistoryQuery = useQuery({
    queryKey: ['training', 'exercise-history'],
    queryFn: async () => {
      const res = await apiGet('/training/exercise-history');
      if (!res.ok) return [] as EnrichedExerciseHistory[];
      const data = await res.json();
      return (data.exercises || []) as EnrichedExerciseHistory[];
    },
  });

  const rows = useMemo(
    () => buildRows(
      muscleGroups,
      guardrailsQuery.data ?? {},
      progressionQuery.data?.progressions ?? [],
      prFeedQuery.data ?? [],
    ),
    [muscleGroups, guardrailsQuery.data, progressionQuery.data, prFeedQuery.data],
  );

  if (
    guardrailsQuery.isLoading
    || progressionQuery.isLoading
    || prFeedQuery.isLoading
    || volumeHistoryQuery.isLoading
    || exerciseHistoryQuery.isLoading
  ) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.accent_primary} />
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No muscle group data yet</Text>
        <Text style={styles.emptyText}>Complete workouts to see muscle-level progress.</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.introText}>
        Strength, volume, and PR signals grouped by body area.
      </Text>
      {rows.map((row) => (
        <MuscleGroupCard
          key={row.muscle}
          row={row}
          exercises={exerciseHistoryQuery.data ?? []}
          volumeWeeks={volumeHistoryQuery.data ?? []}
        />
      ))}
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
  introText: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  titleWrap: {
    flex: 1,
  },
  muscleName: {
    color: COLORS.text_primary,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryText: {
    color: COLORS.text_secondary,
    fontSize: 13,
  },
  statusPill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  segmentGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.sm,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  segment: {
    minHeight: 34,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: '#303036',
  },
  segmentText: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: COLORS.text_primary,
  },
  rangeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rangeText: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '800',
  },
  rangeTextActive: {
    color: COLORS.accent_primary,
  },
  chartPanel: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    overflow: 'hidden',
  },
  chartReadout: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.md,
    zIndex: 1,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(12, 12, 14, 0.72)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  chartHint: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.md,
    zIndex: 1,
    color: COLORS.text_tertiary,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(12, 12, 14, 0.58)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  chartReadoutValue: {
    color: COLORS.text_primary,
    fontSize: 12,
    fontWeight: '800',
  },
  chartReadoutMeta: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  emptyChart: {
    minHeight: 180,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg_secondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  emptyChartText: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  contextText: {
    flex: 1,
    color: COLORS.text_secondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
