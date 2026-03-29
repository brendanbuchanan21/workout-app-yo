import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING } from '../../constants/theme';
import { EQUIPMENT_ORDER } from '../../constants/training';
import { EnrichedPREntry } from '../../types/training';
import EquipmentSection from './EquipmentSection';

interface MuscleGroupViewProps {
  exercises: EnrichedPREntry[];
  expandedExercise: string | null;
  onToggleExercise: (key: string) => void;
}

export default function MuscleGroupView({
  exercises,
  expandedExercise,
  onToggleExercise,
}: MuscleGroupViewProps) {
  if (exercises.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No exercises tracked for this muscle group yet.</Text>
      </View>
    );
  }

  // Group by equipment, sorted by EQUIPMENT_ORDER
  const byEquipment: Record<string, EnrichedPREntry[]> = {};
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
    <View>
      <Text style={styles.count}>
        {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
      </Text>
      {sortedEquipment.map((eq) => (
        <EquipmentSection
          key={eq}
          equipment={eq}
          exercises={byEquipment[eq]}
          expandedExercise={expandedExercise}
          onToggleExercise={onToggleExercise}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  count: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    marginBottom: SPACING.md,
  },
});
