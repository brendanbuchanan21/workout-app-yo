import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING } from '../../constants/theme';
import { EQUIPMENT_LABELS } from '../../constants/training';
import { EnrichedPREntry } from '../../types/training';
import PRExerciseCard from './PRExerciseCard';

interface EquipmentSectionProps {
  equipment: string;
  exercises: EnrichedPREntry[];
  expandedExercise: string | null;
  onToggleExercise: (key: string) => void;
}

export default function EquipmentSection({
  equipment,
  exercises,
  expandedExercise,
  onToggleExercise,
}: EquipmentSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {EQUIPMENT_LABELS[equipment] || equipment}
      </Text>
      {exercises.map((pr) => {
        const key = pr.catalogId || pr.exerciseName;
        return (
          <PRExerciseCard
            key={key}
            pr={pr}
            isExpanded={expandedExercise === key}
            onToggle={() => onToggleExercise(key)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
});
