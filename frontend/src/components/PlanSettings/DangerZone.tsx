import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface DangerZoneProps {
  onEndBlock: () => void;
}

const DangerZone = ({ onEndBlock }: DangerZoneProps) => (
  <View style={styles.dangerZone}>
    <Text style={styles.dangerTitle}>Danger Zone</Text>
    <TouchableOpacity style={styles.dangerButton} onPress={onEndBlock}>
      <Text style={styles.dangerButtonText}>End Block Early</Text>
    </TouchableOpacity>
  </View>
);

export default DangerZone;

const styles = StyleSheet.create({
  dangerZone: {
    marginTop: SPACING.xxxl,
    paddingTop: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.danger,
    marginBottom: SPACING.md,
  },
  dangerButton: {
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.danger_subtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  dangerButtonText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '700',
  },
});
