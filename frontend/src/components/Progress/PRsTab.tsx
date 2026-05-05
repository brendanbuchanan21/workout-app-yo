import { useState, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { CardGradientSurface } from '../shared/CardGradientSurface';
import { ALL_MUSCLE_GROUPS } from '../../constants/training';
import { EnrichedPREntry, PREvent } from '../../types/training';
import PRSearchBar from './PRSearchBar';
import MuscleGroupPills from './MuscleGroupPills';
import PRFeedView from './PRFeedView';
import MuscleGroupView from './MuscleGroupView';
import PRExerciseCard from './PRExerciseCard';

export default function PRsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const prsQuery = useQuery({
    queryKey: ['training', 'prs'],
    queryFn: async () => {
      const res = await apiGet('/training/prs');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.prs || []) as EnrichedPREntry[];
    },
  });

  const feedQuery = useQuery({
    queryKey: ['training', 'prs', 'feed'],
    queryFn: async () => {
      const res = await apiGet('/training/prs/feed');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.prEvents || []) as PREvent[];
    },
  });

  const prs = prsQuery.data ?? [];
  const feedEvents = feedQuery.data ?? [];

  // Only show muscle groups that have at least one PR
  const availableMuscles = useMemo(() => {
    const musclesWithPRs = new Set(prs.map((p) => p.primaryMuscle));
    return ALL_MUSCLE_GROUPS.filter((m) => musclesWithPRs.has(m));
  }, [prs]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { recent: feedEvents.length };
    for (const pr of prs) {
      counts[pr.primaryMuscle] = (counts[pr.primaryMuscle] || 0) + 1;
    }
    return counts;
  }, [feedEvents.length, prs]);

  const toggleExercise = (key: string) => {
    setExpandedExercise(expandedExercise === key ? null : key);
  };

  const loading = prsQuery.isLoading || feedQuery.isLoading;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.accent_primary} />
      </View>
    );
  }

  const searchActive = searchQuery.trim().length > 0;

  // Search filters across all exercises
  const searchResults = searchActive
    ? prs.filter((p) =>
        p.exerciseName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Muscle group filter
  const muscleFiltered = selectedMuscle
    ? prs.filter((p) => p.primaryMuscle === selectedMuscle)
    : [];

  return (
    <View>
      <CardGradientSurface gradientId="progressRecordsHero" style={styles.hero}>
        <View style={styles.heroInner}>
          <View>
            <Text style={styles.heroLabel}>Record Book</Text>
            <Text style={styles.heroValue}>{feedEvents.length}</Text>
            <Text style={styles.heroMeta}>recent PR event{feedEvents.length === 1 ? '' : 's'}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{prs.length}</Text>
            <Text style={styles.heroStatLabel}>tracked lifts</Text>
          </View>
        </View>
      </CardGradientSurface>

      <PRSearchBar value={searchQuery} onChangeText={setSearchQuery} />

      {!searchActive && (
        <MuscleGroupPills
          muscles={availableMuscles}
          selected={selectedMuscle}
          onSelect={setSelectedMuscle}
          counts={filterCounts}
        />
      )}

      {searchActive ? (
        // Search results — flat list across all muscle groups
        <View>
          {searchResults.map((pr) => {
            const key = pr.catalogId || pr.exerciseName;
            return (
              <PRExerciseCard
                key={key}
                pr={pr}
                isExpanded={expandedExercise === key}
                onToggle={() => toggleExercise(key)}
              />
            );
          })}
        </View>
      ) : selectedMuscle === null ? (
        // Recent — PR feed timeline
        <PRFeedView events={feedEvents} />
      ) : (
        // Muscle group — grouped by equipment
        <MuscleGroupView
          exercises={muscleFiltered}
          expandedExercise={expandedExercise}
          onToggleExercise={toggleExercise}
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
  hero: {
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  heroLabel: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroValue: {
    color: COLORS.accent_primary,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 2,
  },
  heroMeta: {
    color: COLORS.text_secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  heroDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.lg,
  },
  heroStat: {
    flex: 1,
  },
  heroStatValue: {
    color: COLORS.text_primary,
    fontSize: 22,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
