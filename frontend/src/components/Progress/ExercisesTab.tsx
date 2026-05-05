import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { apiGet } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { ALL_MUSCLE_GROUPS, EQUIPMENT_ORDER, EQUIPMENT_LABELS } from '../../constants/training';
import { EnrichedExerciseHistory } from '../../types/training';
import PRSearchBar from './PRSearchBar';
import MuscleGroupPills from './MuscleGroupPills';
import EquipmentIcon from '../EquipmentIcon';
import MuscleGroupIcon from '../MuscleGroupIcon';
import ProgressionBadge from './ProgressionBadge';
import { ExerciseProgression } from '../../utils/progressionInsights';

function formatWeight(kg: number): string {
  return `${Math.round(kg * 2.20462)} lbs`;
}

const screenWidth = Dimensions.get('window').width;

function renderE1rmChart(ex: EnrichedExerciseHistory) {
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

interface ExerciseWithE1rm extends EnrichedExerciseHistory {
  latestE1rm: number;
  peakE1rm: number;
  trending: number;
}

function computeE1rmData(exercises: EnrichedExerciseHistory[]): ExerciseWithE1rm[] {
  return exercises
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
}

function getSignalCopy(progression?: ExerciseProgression): string {
  if (!progression) return 'Open strength and volume details';
  if (progression.detail) return progression.detail;
  if (progression.status === 'progressing') return 'Recent performance is moving up';
  if (progression.status === 'regressing') return 'Recent performance is trending down';
  return 'Recent performance is mostly flat';
}

function getSignalMeta(ex: ExerciseWithE1rm, progression?: ExerciseProgression): string {
  if (!progression) {
    return `${ex.history.length} session${ex.history.length !== 1 ? 's' : ''}`;
  }

  return `${progression.sessionsAnalyzed} sessions analyzed · ${progression.confidence} confidence`;
}

function ExerciseCard({ ex, isExpanded, onToggle, onViewDetail, progression, phaseIntent }: {
  ex: ExerciseWithE1rm;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetail?: (catalogId: string, exerciseName: string) => void;
  progression?: ExerciseProgression;
  phaseIntent?: string | null;
}) {
  const opensDetail = !!onViewDetail && !!ex.catalogId;
  const signalCopy = getSignalCopy(progression);
  const signalMeta = getSignalMeta(ex, progression);
  const gradientId = `exerciseCard${(ex.catalogId || ex.exerciseName).replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        if (opensDetail) onViewDetail(ex.catalogId!, ex.exerciseName);
        else onToggle();
      }}
      activeOpacity={0.7}
    >
      <Svg style={styles.cardGradient} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`${gradientId}Bg`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={COLORS.bg_secondary} stopOpacity="1" />
            <Stop offset="1" stopColor={COLORS.bg_primary} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id={`${gradientId}Sheen`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.text_primary} stopOpacity="0.016" />
            <Stop offset="0.34" stopColor={COLORS.text_primary} stopOpacity="0.005" />
            <Stop offset="1" stopColor={COLORS.text_primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId}Bg)`} />
        <Rect x="0" y="0" width="100%" height="48%" fill={`url(#${gradientId}Sheen)`} />
      </Svg>
      <View style={styles.cardHeader}>
        <View style={styles.muscleIcon}>
          <MuscleGroupIcon muscle={ex.primaryMuscle} size={32} />
        </View>
        <View style={styles.cardInfo}>
          <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.sm }}>
            <Text style={styles.cardName}>{ex.exerciseName}</Text>
            {progression && <ProgressionBadge status={progression.status} phaseIntent={phaseIntent} />}
          </View>
          <Text style={styles.cardMeta}>
            {signalCopy}
          </Text>
          <Text style={styles.cardSubMeta}>
            {signalMeta}
          </Text>
        </View>
        <View style={styles.cardBest}>
          <Text style={styles.cardBestLabel}>Latest e1RM</Text>
          <Text style={styles.cardWeight}>{formatWeight(ex.latestE1rm)}</Text>
        </View>
        {opensDetail && (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.text_tertiary}
            style={styles.detailChevron}
          />
        )}
      </View>

      {!opensDetail && isExpanded && (
        <View style={styles.expanded}>
          {ex.history.length > 1 && renderE1rmChart(ex)}

          <Text style={[styles.historyLabel, { marginTop: SPACING.md }]}>Session History</Text>
          {[...ex.history].reverse().slice(0, 10).map((h, i) => (
            <View key={i} style={styles.recordRow}>
              <Text style={styles.recordDate}>
                {new Date(h.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.recordWeight}>
                {formatWeight(h.bestWeightKg)} x {h.bestReps}
              </Text>
              <Text style={styles.recordE1rm}>
                e1RM: {formatWeight(h.e1rmKg)}
              </Text>
            </View>
          ))}

          {onViewDetail && ex.catalogId && (
            <TouchableOpacity
              style={styles.viewDetailBtn}
              onPress={() => onViewDetail(ex.catalogId!, ex.exerciseName)}
            >
              <Text style={styles.viewDetailText}>View Details</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function ExerciseList({ exercises, expandedExercise, onToggle, onViewDetail, progressionMap, phaseIntent }: {
  exercises: ExerciseWithE1rm[];
  expandedExercise: string | null;
  onToggle: (key: string) => void;
  onViewDetail?: (catalogId: string, exerciseName: string) => void;
  progressionMap?: Map<string, ExerciseProgression>;
  phaseIntent?: string | null;
}) {
  return (
    <>
      {exercises.map((ex) => {
        const key = ex.catalogId || ex.exerciseName;
        return (
          <ExerciseCard
            key={key}
            ex={ex}
            isExpanded={expandedExercise === key}
            onToggle={() => onToggle(key)}
            onViewDetail={onViewDetail}
            progression={progressionMap?.get(key)}
            phaseIntent={phaseIntent}
          />
        );
      })}
    </>
  );
}

function EquipmentGroupedList({ exercises, expandedExercise, onToggle, onViewDetail, progressionMap, phaseIntent }: {
  exercises: ExerciseWithE1rm[];
  expandedExercise: string | null;
  onToggle: (key: string) => void;
  onViewDetail?: (catalogId: string, exerciseName: string) => void;
  progressionMap?: Map<string, ExerciseProgression>;
  phaseIntent?: string | null;
}) {
  const byEquipment: Record<string, ExerciseWithE1rm[]> = {};
  for (const ex of exercises) {
    const eq = ex.equipment || 'unknown';
    if (!byEquipment[eq]) byEquipment[eq] = [];
    byEquipment[eq].push(ex);
  }

  const sortedEquipment = Object.keys(byEquipment).sort((a, b) => {
    const ai = EQUIPMENT_ORDER.indexOf(a);
    const bi = EQUIPMENT_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <>
      <Text style={styles.count}>
        {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
      </Text>
      {sortedEquipment.map((eq) => (
        <View key={eq} style={styles.equipmentSection}>
          <View style={styles.equipmentHeader}>
            <View style={styles.equipmentIconWrap}>
              <EquipmentIcon equipment={eq} size={16} color={COLORS.accent_primary} />
            </View>
            <Text style={styles.equipmentTitle}>
              {EQUIPMENT_LABELS[eq] || eq}
            </Text>
            <View style={styles.equipmentLine} />
          </View>
          <ExerciseList
            exercises={byEquipment[eq]}
            expandedExercise={expandedExercise}
            onToggle={onToggle}
            onViewDetail={onViewDetail}
            progressionMap={progressionMap}
            phaseIntent={phaseIntent}
          />
        </View>
      ))}
    </>
  );
}

interface ExercisesTabProps {
  onViewDetail?: (catalogId: string, exerciseName: string) => void;
}

type ExerciseMode = 'attention' | 'improving' | 'all';

export default function ExercisesTab({ onViewDetail }: ExercisesTabProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [mode, setMode] = useState<ExerciseMode>('attention');
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ['training', 'exercise-history'],
    queryFn: async () => {
      const res = await apiGet('/training/exercise-history');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.exercises || []) as EnrichedExerciseHistory[];
    },
  });

  const progressionQuery = useQuery({
    queryKey: ['training', 'progression-status'],
    queryFn: async () => {
      const res = await apiGet('/training/progression/status');
      if (!res.ok) return { progressions: [] as ExerciseProgression[], phaseIntent: null as string | null };
      return res.json();
    },
  });

  const progressionMap = useMemo(() => {
    const map = new Map<string, ExerciseProgression>();
    for (const p of (progressionQuery.data?.progressions ?? [])) {
      map.set(p.catalogId || p.exerciseName, p);
    }
    return map;
  }, [progressionQuery.data]);

  const phaseIntent = progressionQuery.data?.phaseIntent ?? null;

  const exercises = historyQuery.data ?? [];

  const availableMuscles = useMemo(() => {
    const musclesWithData = new Set(exercises.map((e) => e.primaryMuscle));
    return ALL_MUSCLE_GROUPS.filter((m) => musclesWithData.has(m));
  }, [exercises]);

  const allE1rms = useMemo(() => computeE1rmData(exercises), [exercises]);

  const toggleExercise = (key: string) => {
    setExpandedExercise(expandedExercise === key ? null : key);
  };

  if (historyQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.accent_primary} />
      </View>
    );
  }

  if (exercises.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No Strength Data</Text>
        <Text style={styles.emptyText}>
          Complete workouts to see your estimated 1RM and exercise progression.
        </Text>
      </View>
    );
  }

  const searchActive = searchQuery.trim().length > 0;

  const searchResults = searchActive
    ? allE1rms.filter((e) =>
        e.exerciseName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const muscleFiltered = selectedMuscle
    ? allE1rms.filter((e) => e.primaryMuscle === selectedMuscle)
    : allE1rms;
  const attentionExercises = allE1rms
    .filter((e) => {
      const key = e.catalogId || e.exerciseName;
      const progression = progressionMap.get(key);
      return progression?.status === 'regressing' || progression?.status === 'stalled';
    })
    .sort((a, b) => {
      const aProgression = progressionMap.get(a.catalogId || a.exerciseName);
      const bProgression = progressionMap.get(b.catalogId || b.exerciseName);
      const aRank = aProgression?.status === 'regressing' ? 0 : 1;
      const bRank = bProgression?.status === 'regressing' ? 0 : 1;
      return aRank - bRank || Math.abs(bProgression?.e1rmChangePercent || 0) - Math.abs(aProgression?.e1rmChangePercent || 0);
    });
  const improvingExercises = allE1rms
    .filter((e) => {
      const key = e.catalogId || e.exerciseName;
      return progressionMap.get(key)?.status === 'progressing';
    })
    .sort((a, b) => {
      const aProgression = progressionMap.get(a.catalogId || a.exerciseName);
      const bProgression = progressionMap.get(b.catalogId || b.exerciseName);
      return (bProgression?.e1rmChangePercent || 0) - (aProgression?.e1rmChangePercent || 0);
    });
  const allModeActive = mode === 'all';
  const modeExercises = mode === 'attention'
    ? attentionExercises
    : mode === 'improving'
      ? improvingExercises
      : muscleFiltered;
  const visibleExercises = allModeActive && searchActive ? searchResults : modeExercises;
  const emptyModeCopy = mode === 'attention'
    ? 'No exercises need attention right now.'
    : mode === 'improving'
      ? 'No improving exercises yet. Keep logging sessions to build the signal.'
      : 'No exercises match that filter.';

  return (
    <View>
      <Text style={styles.subtitle}>Lift-level progress. Open an exercise for strength and volume details.</Text>

      <View style={styles.modeRow}>
        {([
          ['attention', 'Needs Attention'],
          ['improving', 'Improving'],
          ['all', 'All'],
        ] as [ExerciseMode, string][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.modeChip,
              key === 'improving' && styles.modeChipImproving,
              mode === key && styles.modeChipActive,
              mode === key && key === 'improving' && styles.modeChipActiveImproving,
              mode === key && key === 'all' && styles.modeChipActiveAll,
            ]}
            activeOpacity={0.75}
            onPress={() => {
              setMode(key);
              setSearchQuery('');
              setSelectedMuscle(null);
            }}
          >
            <Text
              style={[
                styles.modeChipText,
                key === 'improving' && styles.modeChipTextImproving,
                mode === key && styles.modeChipTextActive,
                mode === key && key === 'improving' && styles.modeChipTextActiveImproving,
                mode === key && key === 'all' && styles.modeChipTextActiveAll,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {allModeActive && (
        <>
          <PRSearchBar value={searchQuery} onChangeText={setSearchQuery} />

          {!searchActive && (
            <MuscleGroupPills
              muscles={availableMuscles}
              selected={selectedMuscle}
              onSelect={setSelectedMuscle}
            />
          )}
        </>
      )}

      {visibleExercises.length === 0 ? (
        <View style={styles.emptyModeCard}>
          <Text style={styles.emptyModeText}>{emptyModeCopy}</Text>
        </View>
      ) : allModeActive && selectedMuscle && !searchActive ? (
        <EquipmentGroupedList
          exercises={visibleExercises}
          expandedExercise={expandedExercise}
          onToggle={toggleExercise}
          onViewDetail={onViewDetail}
          progressionMap={progressionMap}
          phaseIntent={phaseIntent}
        />
      ) : (
        <ExerciseList
          exercises={visibleExercises}
          expandedExercise={expandedExercise}
          onToggle={toggleExercise}
          onViewDetail={onViewDetail}
          progressionMap={progressionMap}
          phaseIntent={phaseIntent}
        />
      )}
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
  subtitle: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: SPACING.md,
  },
  modeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  modeChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg_primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  modeChipImproving: {
    borderColor: COLORS.border,
  },
  modeChipActive: {
    backgroundColor: COLORS.bg_secondary,
    borderColor: COLORS.accent_primary,
    shadowColor: COLORS.accent_primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  modeChipActiveImproving: {
    backgroundColor: '#111814',
    borderColor: COLORS.success,
    shadowColor: COLORS.success,
  },
  modeChipActiveAll: {
    backgroundColor: COLORS.bg_secondary,
    borderColor: COLORS.border,
    shadowColor: COLORS.text_secondary,
  },
  modeChipText: {
    color: COLORS.text_secondary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  modeChipTextActive: {
    color: COLORS.accent_light,
  },
  modeChipTextImproving: {
    color: COLORS.text_secondary,
  },
  modeChipTextActiveImproving: {
    color: COLORS.success,
  },
  modeChipTextActiveAll: {
    color: COLORS.text_primary,
  },
  emptyModeCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyModeText: {
    color: COLORS.text_secondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  count: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    marginBottom: SPACING.md,
  },
  equipmentSection: {
    marginBottom: SPACING.xl,
  },
  equipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  equipmentIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent_subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  equipmentTitle: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: SPACING.md,
  },
  equipmentLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border_subtle,
  },
  card: {
    backgroundColor: COLORS.bg_primary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  muscleIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  cardInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  cardName: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '600',
  },
  cardMeta: {
    color: COLORS.text_secondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: SPACING.xs,
  },
  cardSubMeta: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  cardBest: {
    justifyContent: 'center',
  },
  cardBestLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  detailChevron: {
    marginLeft: SPACING.sm,
  },
  cardWeight: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  expanded: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  historyLabel: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border_subtle,
  },
  recordDate: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    minWidth: 76,
  },
  recordWeight: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 88,
  },
  recordE1rm: {
    color: COLORS.accent_primary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  viewDetailBtn: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    backgroundColor: COLORS.accent_subtle,
    borderRadius: RADIUS.sm,
  },
  viewDetailText: {
    color: COLORS.accent_primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
