import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface PRRecord {
  weightKg: number;
  reps: number;
  date: string;
}

interface PREntry {
  exerciseName: string;
  catalogId: string | null;
  records: PRRecord[];
}

interface PRsTabProps {
  prs: PREntry[];
  expandedPR: string | null;
  togglePR: (pr: PREntry) => void;
}

function formatWeight(kg: number): string {
  return `${Math.round(kg * 2.20462)} lbs`;
}

export default function PRsTab({ prs, expandedPR, togglePR }: PRsTabProps) {
  if (prs.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No PRs Yet</Text>
        <Text style={styles.emptyText}>Complete workouts to start tracking your personal records.</Text>
      </View>
    );
  }

  return (
    <>
      <Text style={styles.prCount}>{prs.length} exercise{prs.length !== 1 ? 's' : ''} tracked</Text>
      {prs.map((pr) => {
        const key = pr.catalogId || pr.exerciseName;
        const isExpanded = expandedPR === key;
        const topRecord = pr.records[0];

        return (
          <TouchableOpacity
            key={key}
            style={styles.prCard}
            onPress={() => togglePR(pr)}
            activeOpacity={0.7}
          >
            <View style={styles.prCardHeader}>
              <View style={styles.prCardInfo}>
                <Text style={styles.prCardName}>{pr.exerciseName}</Text>
                <Text style={styles.prCardMeta}>
                  {pr.records.length} weight{pr.records.length !== 1 ? 's' : ''} tracked
                </Text>
              </View>
              {topRecord && (
                <View style={styles.prCardBest}>
                  <Text style={styles.prCardWeight}>{formatWeight(topRecord.weightKg)}</Text>
                  <Text style={styles.prCardReps}>x {topRecord.reps}</Text>
                </View>
              )}
            </View>

            {isExpanded && (
              <View style={styles.prCardExpanded}>
                {pr.records.map((rec, i) => (
                  <View key={i} style={styles.prRecordRow}>
                    <Text style={styles.prRecordWeight}>{formatWeight(rec.weightKg)}</Text>
                    <Text style={styles.prRecordReps}>{rec.reps} reps</Text>
                    <Text style={styles.prRecordDate}>
                      {new Date(rec.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
  prCount: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    marginBottom: SPACING.md,
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
  prCardReps: {
    color: COLORS.text_secondary,
    fontSize: 13,
    marginTop: 1,
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
});
