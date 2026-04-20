import { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../../utils/api';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { detectVolumeInsights, Guardrail, Insight, VolumeWeek } from '../../utils/insights';
import { deriveProgressionInsights, ExerciseProgression } from '../../utils/progressionInsights';
import InsightCard from './InsightCard';

interface InsightsTabProps {
  onJumpToMuscleVolume: (muscle: string) => void;
}

const severityOrder: Record<string, number> = { warning: 0, info: 1, success: 2 };

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function getInsightGroupKey(insight: Insight): string {
  if (insight.groupKey) return insight.groupKey;

  return [
    insight.kind,
    insight.severity,
    insight.summary,
    insight.qualifier || '',
    insight.bullets.join('|'),
  ].join('::');
}

function getGroupedLeadCopy(lead: Insight, relatedCount: number): Pick<Insight, 'title' | 'summary'> {
  const totalCount = relatedCount + 1;

  switch (lead.groupKey) {
    case 'volume:declining':
      return {
        title: `Volume trending down across ${totalCount} muscle ${pluralize(totalCount, 'group')}`,
        summary: `${lead.entityLabel || lead.title} is the clearest example, with ${relatedCount} other muscle ${pluralize(relatedCount, 'group')} showing the same pattern.`,
      };
    case 'volume:above-ceiling':
      return {
        title: `${totalCount} muscle ${pluralize(totalCount, 'group')} above ceiling`,
        summary: `${lead.entityLabel || lead.title} is the clearest example, with ${relatedCount} other muscle ${pluralize(relatedCount, 'group')} also above their recoverable range.`,
      };
    case 'volume:below-floor':
      return {
        title: `${totalCount} muscle ${pluralize(totalCount, 'group')} below productive range`,
        summary: `${lead.entityLabel || lead.title} is the clearest example, with ${relatedCount} other muscle ${pluralize(relatedCount, 'group')} also running under a productive dose.`,
      };
    default:
      return {
        title: lead.title,
        summary: `${lead.summary} Also showing up in ${relatedCount} other ${pluralize(relatedCount, 'exercise')}.`,
      };
  }
}

function groupInsights(insights: Insight[]): Insight[] {
  const grouped = new Map<string, Insight[]>();

  for (const insight of insights) {
    const key = getInsightGroupKey(insight);

    const existing = grouped.get(key);
    if (existing) existing.push(insight);
    else grouped.set(key, [insight]);
  }

  const merged: Insight[] = [];

  for (const bucket of grouped.values()) {
    if (bucket.length === 1) {
      merged.push(bucket[0]);
      continue;
    }

    const [lead, ...rest] = bucket;
    const relatedEntityLabels = rest
      .map((item) => item.entityLabel || item.title)
      .filter((label): label is string => !!label);
    const groupedCopy = getGroupedLeadCopy(lead, relatedEntityLabels.length);

    merged.push({
      ...lead,
      title: groupedCopy.title,
      summary: groupedCopy.summary,
      relatedEntityLabels,
    });
  }

  merged.sort((a, b) => (severityOrder[a.severity] ?? 1) - (severityOrder[b.severity] ?? 1));
  return merged;
}

export default function InsightsTab({ onJumpToMuscleVolume: _onJumpToMuscleVolume }: InsightsTabProps) {
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

  const progressionQuery = useQuery({
    queryKey: ['training', 'progression-status'],
    queryFn: async () => {
      const res = await apiGet('/training/progression/status');
      if (!res.ok) return { progressions: [] as ExerciseProgression[], phaseIntent: null as string | null };
      return res.json();
    },
  });

  const insights: Insight[] = useMemo(() => {
    const weeks = volumeHistoryQuery.data ?? [];
    const guardrails = guardrailsQuery.data ?? {};
    const volumeInsights = detectVolumeInsights(weeks, guardrails);

    const progressions = progressionQuery.data?.progressions ?? [];
    const phaseIntent = progressionQuery.data?.phaseIntent ?? null;
    const progressionInsights = deriveProgressionInsights(progressions, phaseIntent);

    // Merge: warnings first, then info, then success
    const all = groupInsights([...volumeInsights, ...progressionInsights]);
    all.sort((a, b) => (severityOrder[a.severity] ?? 1) - (severityOrder[b.severity] ?? 1));
    return all;
  }, [volumeHistoryQuery.data, guardrailsQuery.data, progressionQuery.data]);

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
