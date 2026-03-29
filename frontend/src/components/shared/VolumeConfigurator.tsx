import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { ALL_MUSCLE_GROUPS, MUSCLE_LABELS, DEFAULT_VOLUME_GUARDRAILS } from '../../constants/training';

interface VolumeConfiguratorProps {
  volumeTargets: Record<string, number>;
  setVolumeTargets: (targets: Record<string, number>) => void;
  guardrails: Record<string, { floor: number; ceiling: number }>;
  setGuardrails: (guardrails: Record<string, { floor: number; ceiling: number }>) => void;
  setGuardrailsDirty?: (dirty: boolean) => void;
  expandedGuardrail: string | null;
  setExpandedGuardrail: (muscle: string | null) => void;
  showInfoModal: boolean;
  setShowInfoModal: (show: boolean) => void;
  subtitle?: string;
}

const VolumeConfigurator = ({
  volumeTargets,
  setVolumeTargets,
  guardrails,
  setGuardrails,
  setGuardrailsDirty,
  expandedGuardrail,
  setExpandedGuardrail,
  showInfoModal,
  setShowInfoModal,
  subtitle,
}: VolumeConfiguratorProps) => {
  const markDirty = () => {
    if (setGuardrailsDirty) setGuardrailsDirty(true);
  };

  return (
    <View>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Volume Targets</Text>
        <TouchableOpacity onPress={() => setShowInfoModal(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={styles.infoButton}>
            <Text style={styles.infoButtonText}>i</Text>
          </View>
        </TouchableOpacity>
      </View>
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}

      {ALL_MUSCLE_GROUPS.map((muscle) => {
        const guard = guardrails[muscle] || DEFAULT_VOLUME_GUARDRAILS[muscle];
        const value = volumeTargets[muscle] || 0;
        const isExpanded = expandedGuardrail === muscle;
        return (
          <View key={muscle}>
            <View style={styles.volumeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.volumeLabel}>{MUSCLE_LABELS[muscle]}</Text>
                <TouchableOpacity onPress={() => setExpandedGuardrail(isExpanded ? null : muscle)}>
                  <Text style={styles.volumeRange}>
                    Floor {guard.floor}, Ceiling {guard.ceiling} <Text style={styles.editHint}>(edit)</Text>
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.volumeControls}>
                <TouchableOpacity
                  style={styles.volumeBtn}
                  onPress={() => {
                    const newVal = Math.max(0, value - 2);
                    setVolumeTargets({ ...volumeTargets, [muscle]: newVal });
                  }}
                >
                  <Text style={styles.volumeBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={[
                  styles.volumeValue,
                  value < guard.floor && value > 0 && { color: COLORS.warning },
                  value > guard.ceiling && { color: COLORS.danger },
                ]}>
                  {value}
                </Text>
                <TouchableOpacity
                  style={styles.volumeBtn}
                  onPress={() => {
                    const newVal = Math.min(guard.ceiling + 2, value + 2);
                    setVolumeTargets({ ...volumeTargets, [muscle]: newVal });
                  }}
                >
                  <Text style={styles.volumeBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            {isExpanded && (
              <View style={styles.guardrailEditor}>
                <View style={styles.guardrailRow}>
                  <Text style={styles.guardrailLabel}>Floor</Text>
                  <TouchableOpacity
                    style={styles.guardrailBtn}
                    onPress={() => {
                      const newFloor = Math.max(0, guard.floor - 1);
                      if (newFloor < guard.ceiling) {
                        setGuardrails({ ...guardrails, [muscle]: { ...guard, floor: newFloor } });
                        markDirty();
                        if (value > 0 && value < newFloor) {
                          setVolumeTargets({ ...volumeTargets, [muscle]: newFloor });
                        }
                      }
                    }}
                  >
                    <Text style={styles.guardrailBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.guardrailValue}>{guard.floor}</Text>
                  <TouchableOpacity
                    style={styles.guardrailBtn}
                    onPress={() => {
                      const newFloor = guard.floor + 1;
                      if (newFloor < guard.ceiling) {
                        setGuardrails({ ...guardrails, [muscle]: { ...guard, floor: newFloor } });
                        markDirty();
                        if (value > 0 && value < newFloor) {
                          setVolumeTargets({ ...volumeTargets, [muscle]: newFloor });
                        }
                      }
                    }}
                  >
                    <Text style={styles.guardrailBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.guardrailRow}>
                  <Text style={styles.guardrailLabel}>Ceiling</Text>
                  <TouchableOpacity
                    style={styles.guardrailBtn}
                    onPress={() => {
                      const newCeiling = guard.ceiling - 1;
                      if (newCeiling > guard.floor) {
                        setGuardrails({ ...guardrails, [muscle]: { ...guard, ceiling: newCeiling } });
                        markDirty();
                        if (value > newCeiling) {
                          setVolumeTargets({ ...volumeTargets, [muscle]: newCeiling });
                        }
                      }
                    }}
                  >
                    <Text style={styles.guardrailBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.guardrailValue}>{guard.ceiling}</Text>
                  <TouchableOpacity
                    style={styles.guardrailBtn}
                    onPress={() => {
                      setGuardrails({ ...guardrails, [muscle]: { ...guard, ceiling: guard.ceiling + 1 } });
                      markDirty();
                    }}
                  >
                    <Text style={styles.guardrailBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}

      <Modal visible={showInfoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Volume Guardrails</Text>
            <Text style={styles.modalBody}>
              <Text style={styles.modalBold}>Floor (Minimum Volume)</Text>
              {'\n'}The fewest weekly sets per muscle group that still produce measurable growth. Going below the floor means you're likely not providing enough stimulus.
            </Text>
            <Text style={[styles.modalBody, { marginTop: SPACING.md }]}>
              <Text style={styles.modalBold}>Ceiling (Maximum Volume)</Text>
              {'\n'}The most weekly sets you can handle while still recovering between sessions. Exceeding the ceiling leads to accumulated fatigue and potential regression.
            </Text>
            <Text style={[styles.modalBody, { marginTop: SPACING.md, color: COLORS.text_tertiary }]}>
              Advanced lifters can customize these values by tapping the floor/ceiling numbers next to each muscle group.
            </Text>
            <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowInfoModal(false)}>
              <Text style={styles.modalDismissText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default VolumeConfigurator;

const styles = StyleSheet.create({
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text_primary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.text_tertiary,
    marginBottom: SPACING.sm,
  },
  infoButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.text_tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text_tertiary,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border_subtle,
  },
  volumeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text_primary,
  },
  volumeRange: {
    fontSize: 11,
    color: COLORS.text_tertiary,
    marginTop: 2,
  },
  editHint: {
    color: COLORS.accent_muted,
    fontSize: 10,
  },
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  volumeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg_elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text_primary,
  },
  volumeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent_light,
    minWidth: 30,
    textAlign: 'center',
  },
  guardrailEditor: {
    flexDirection: 'row',
    gap: SPACING.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  guardrailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  guardrailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text_tertiary,
    width: 42,
  },
  guardrailBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bg_input,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardrailBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text_secondary,
  },
  guardrailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text_primary,
    minWidth: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text_primary,
    marginBottom: SPACING.lg,
  },
  modalBody: {
    fontSize: 14,
    color: COLORS.text_secondary,
    lineHeight: 20,
  },
  modalBold: {
    fontWeight: '700',
    color: COLORS.accent_light,
  },
  modalDismiss: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  modalDismissText: {
    color: COLORS.text_on_accent,
    fontSize: 15,
    fontWeight: '700',
  },
});
