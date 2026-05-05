import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { formatTonnage } from '../../utils/format';
import { CardGradientSurface } from '../shared/CardGradientSurface';

interface Session {
  date: string;
  totalTonnageKg: number;
  totalSets: number;
}

interface VolumeSessionListProps {
  sessions: Session[];
}

function formatDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function VolumeSessionList({ sessions }: VolumeSessionListProps) {
  return (
    <CardGradientSurface gradientId="exDetailVolSessions" style={styles.container}>
      <Text style={styles.title}>Volume Sessions</Text>
      {[...sessions].reverse().slice(0, 10).map((session) => (
        <View key={session.date} style={styles.row}>
          <View>
            <Text style={styles.date}>{formatDate(session.date)}</Text>
            <Text style={styles.sets}>{session.totalSets} set{session.totalSets === 1 ? '' : 's'}</Text>
          </View>
          <Text style={styles.tonnage}>{formatTonnage(session.totalTonnageKg)}</Text>
        </View>
      ))}
    </CardGradientSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  title: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border_subtle,
  },
  date: {
    color: COLORS.text_primary,
    fontSize: 13,
    fontWeight: '600',
  },
  sets: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    marginTop: 2,
  },
  tonnage: {
    color: COLORS.accent_primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
