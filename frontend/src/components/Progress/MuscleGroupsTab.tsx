import { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { ALL_MUSCLE_GROUPS, MUSCLE_LABELS } from '../../constants/training';
import { ExerciseProgression } from '../../utils/progressionInsights';
import { PREvent } from '../../types/training';

interface VolumeData {
  sets: number;
  tonnageKg: number;
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

function formatPercent(value: number): string {
  if (Math.abs(value) < 1) return 'flat';
  return `${value > 0 ? '+' : ''}${Math.round(value)}%`;
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
      const statusOrder = { watch: 0, strong: 1, steady: 2 };
      return statusOrder[a.status] - statusOrder[b.status]
        || b.progressing + b.regressing - (a.progressing + a.regressing)
        || b.currentSets - a.currentSets;
    });
}

function MuscleGroupCard({ row }: { row: MuscleRow }) {
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

      <View style={styles.metricRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Volume</Text>
          <Text style={styles.metricValue}>{getVolumeLabel(row)}</Text>
        </View>
        <View style={styles.metricSmall}>
          <Text style={styles.metricLabel}>PRs</Text>
          <Text style={styles.metricValue}>{row.recentPrs} in 30d</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Ionicons
          name={row.volumeDelta < -5 ? 'trending-down' : row.volumeDelta > 5 ? 'trending-up' : 'remove'}
          size={15}
          color={row.volumeDelta < -5 ? COLORS.warning : row.volumeDelta > 5 ? COLORS.success : COLORS.text_tertiary}
        />
        <Text style={styles.contextText}>
          Volume {formatPercent(row.volumeDelta)} vs previous week
          {row.topSignal ? ` · best signal: ${row.topSignal.exerciseName} ${formatPercent(row.topSignal.e1rmChangePercent)}` : ''}
        </Text>
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

  const rows = useMemo(
    () => buildRows(
      muscleGroups,
      guardrailsQuery.data ?? {},
      progressionQuery.data?.progressions ?? [],
      prFeedQuery.data ?? [],
    ),
    [muscleGroups, guardrailsQuery.data, progressionQuery.data, prFeedQuery.data],
  );

  if (guardrailsQuery.isLoading || progressionQuery.isLoading || prFeedQuery.isLoading) {
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
        <MuscleGroupCard key={row.muscle} row={row} />
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
    fontSize: 12,
    lineHeight: 17,
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
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
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryText: {
    color: COLORS.text_secondary,
    fontSize: 13,
  },
  statusPill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  metricRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  metric: {
    flex: 1.4,
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  metricSmall: {
    flex: 1,
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  metricLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    color: COLORS.text_primary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
  },
  contextText: {
    flex: 1,
    color: COLORS.text_secondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
