import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { formatWeight } from '../../utils/format';

interface SetDetail {
  setNumber: number;
  weightKg: number;
  reps: number;
  rir: number | null;
}

interface Session {
  date: string;
  e1rmKg: number;
  bestWeightKg: number;
  bestReps: number;
  totalTonnageKg: number;
  totalSets: number;
  isPR: boolean;
  sets: SetDetail[];
}

interface SessionListProps {
  sessions: Session[];
  expandedSession: string | null;
  onToggle: (date: string) => void;
}

export default function SessionList({ sessions, expandedSession, onToggle }: SessionListProps) {
  const reversed = [...sessions].reverse();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session History</Text>
      {reversed.map((session) => {
        const isExpanded = expandedSession === session.date;
        const d = new Date(session.date + 'T12:00:00');
        const sameYear = d.getFullYear() === new Date().getFullYear();
        const dateLabel = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          ...(sameYear ? {} : { year: 'numeric' }),
        });

        return (
          <TouchableOpacity
            key={session.date}
            style={styles.sessionRow}
            onPress={() => onToggle(isExpanded ? '' : session.date)}
            activeOpacity={0.7}
          >
            <View style={styles.sessionHeader}>
              <Text style={styles.expandIcon}>{isExpanded ? '▾' : '▸'}</Text>
              <Text style={styles.sessionDate}>{dateLabel}</Text>
              <Text style={styles.sessionBest}>
                {formatWeight(session.bestWeightKg)} x {session.bestReps}
              </Text>
              {session.isPR && (
                <View style={styles.prBadge}>
                  <Text style={styles.prBadgeText}>PR</Text>
                </View>
              )}
            </View>

            {isExpanded && (
              <View style={styles.setList}>
                {session.sets.map((set) => (
                  <View key={set.setNumber} style={styles.setRow}>
                    <Text style={styles.setLabel}>Set {set.setNumber}</Text>
                    <Text style={styles.setValue}>
                      {formatWeight(set.weightKg)} x {set.reps}
                    </Text>
                    {set.rir !== null && (
                      <Text style={styles.setRir}>@ RIR {set.rir}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
  },
  title: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  sessionRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border_subtle,
    paddingVertical: SPACING.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIcon: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    width: 18,
  },
  sessionDate: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    width: 78,
    marginRight: SPACING.sm
  },
  sessionBest: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  prBadge: {
    backgroundColor: COLORS.accent_subtle,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  prBadgeText: {
    color: COLORS.accent_primary,
    fontSize: 11,
    fontWeight: '700',
  },
  setList: {
    marginTop: SPACING.sm,
    marginLeft: 18,
    paddingLeft: SPACING.sm,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border_subtle,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  setLabel: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    width: 50,
  },
  setValue: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  setRir: {
    color: COLORS.text_tertiary,
    fontSize: 12,
  },
});
