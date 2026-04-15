import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface PhaseSelectorProps {
  selected: 'bulk' | 'cut' | 'maintain' | null;
  onSelect: (phase: 'bulk' | 'cut' | 'maintain') => void;
  onNext: () => void;
}

const PHASES: { key: 'bulk' | 'cut' | 'maintain'; label: string; desc: string }[] = [
  {
    key: 'bulk',
    label: 'Bulk',
    desc: 'Gain muscle with a caloric surplus. Higher training volume, focused on progressive overload.',
  },
  {
    key: 'cut',
    label: 'Cut',
    desc: 'Lose fat while preserving muscle. Reduced volume, intensity stays high.',
  },
  {
    key: 'maintain',
    label: 'Maintain',
    desc: 'Hold your current physique. Moderate volume and steady progression.',
  },
];

const PhaseSelector = ({ selected, onSelect, onNext }: PhaseSelectorProps) => (
  <View>
    <Text style={styles.headerTitle}>What phase are you in?</Text>
    <Text style={styles.headerSubtitle}>
      This adjusts your volume targets and how the app interprets your progress.
    </Text>

    {PHASES.map((phase) => (
      <TouchableOpacity
        key={phase.key}
        style={[styles.phaseCard, selected === phase.key && styles.phaseCardSelected]}
        onPress={() => onSelect(phase.key)}
      >
        <Text style={[styles.phaseTitle, selected === phase.key && styles.phaseTitleSelected]}>
          {phase.label}
        </Text>
        <Text style={styles.phaseDesc}>{phase.desc}</Text>
      </TouchableOpacity>
    ))}

    {selected && (
      <TouchableOpacity style={styles.continueBtn} onPress={onNext}>
        <Text style={styles.continueBtnText}>Continue</Text>
      </TouchableOpacity>
    )}
  </View>
);

export default PhaseSelector;

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text_primary,
    letterSpacing: -0.5,
    marginBottom: SPACING.sm,
  },
  headerSubtitle: {
    fontSize: 15,
    color: COLORS.text_secondary,
    marginBottom: SPACING.xxl,
    lineHeight: 22,
  },
  phaseCard: {
    padding: SPACING.xl,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.md,
  },
  phaseCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.bg_secondary,
  },
  phaseTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text_primary,
    marginBottom: SPACING.sm,
  },
  phaseTitleSelected: {
    color: COLORS.accent_light,
  },
  phaseDesc: {
    fontSize: 14,
    color: COLORS.text_secondary,
    lineHeight: 20,
  },
  continueBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text_primary,
  },
});
