import { useState, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../../utils/api';
import { COLORS, SPACING } from '../../constants/theme';
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
      <PRSearchBar value={searchQuery} onChangeText={setSearchQuery} />

      {!searchActive && (
        <MuscleGroupPills
          muscles={availableMuscles}
          selected={selectedMuscle}
          onSelect={setSelectedMuscle}
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
});
