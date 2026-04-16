import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface ProgressionBadgeProps {
  status: 'progressing' | 'stalled' | 'regressing';
  phaseIntent?: string | null;
}

const CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  progressing: { label: 'Progressing', color: COLORS.success, icon: '\u2191' },
  stalled: { label: 'Stalled', color: COLORS.warning, icon: '\u2013' },
  regressing: { label: 'Regressing', color: COLORS.danger, icon: '\u2193' },
  // During a cut, stalled is reframed as success
  stalled_cut: { label: 'Maintaining', color: COLORS.success, icon: '\u2713' },
};

export default function ProgressionBadge({ status, phaseIntent }: ProgressionBadgeProps) {
  const key = status === 'stalled' && phaseIntent === 'cut' ? 'stalled_cut' : status;
  const config = CONFIG[key];

  return (
    <View style={[styles.badge, { backgroundColor: config.color + '20' }]}>
      <Text style={[styles.icon, { color: config.color }]}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    gap: 3,
  },
  icon: {
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
