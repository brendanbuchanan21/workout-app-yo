import { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { detectVolumeInsights, Guardrail, Insight, VolumeWeek } from '../../utils/insights';
import InsightCard from './InsightCard';

interface InsightsTabProps {
  onJumpToMuscleVolume: (muscle: string) => void;
}

export default function InsightsTab({ onJumpToMuscleVolume }: InsightsTabProps) {
  // Insights always analyze the last ~12 weeks, regardless of the Volume tab range.
  // Reuse the same query key as VolumeTab for a 3m range so the cache hits.
  const volumeHistoryQuery = useQuery({
    queryKey: ['training', 'volume-history', '3m'],
    queryFn: async () => {
      const res = await apiGet('/training/volume-history?range=3m');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.weeks || []) as VolumeWeek[];
    },
  });

  const guardrailsQuery = useQuery({
    queryKey: ['training', 'volume-guardrails'],
    queryFn: async () => {
      const res = await apiGet('/training/volume-guardrails');
      if (!res.ok) return {} as Record<string, Guardrail>;
      const data = await res.json();
      return (data.guardrails || {}) as Record<string, Guardrail>;
    },
  });

  const insights: Insight[] = useMemo(() => {
    const weeks = volumeHistoryQuery.data ?? [];
    const guardrails = guardrailsQuery.data ?? {};
    return detectVolumeInsights(weeks, guardrails);
  }, [volumeHistoryQuery.data, guardrailsQuery.data]);

  const loading = volumeHistoryQuery.isLoading || guardrailsQuery.isLoading;

  if (loading) {
    return (
      <ActivityIndicator
        size="small"
        color={COLORS.accent_primary}
        style={{ marginTop: SPACING.xxl }}
      />
    );
  }

  if (insights.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No insights right now</Text>
        <Text style={styles.emptyText}>Keep training. We'll flag anything worth your attention.</Text>
      </View>
    );
  }

  return (
    <View>
      {insights.map((insight) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          ctaLabel={`View ${insight.muscle.replace(/_/g, ' ')}`}
          onPressCta={() => onJumpToMuscleVolume(insight.muscle)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  emptyText: {
    color: COLORS.text_secondary,
    fontSize: 13,
    textAlign: 'center',
  },
});
