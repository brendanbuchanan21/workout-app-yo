import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { CardGradientSurface } from '../shared/CardGradientSurface';

interface RirProgressionProps {
  startingRir: number;
  setStartingRir: (v: number) => void;
  rirFloor: number;
  setRirFloor: (v: number) => void;
  rirDecrementPerWeek: number;
  setRirDecrementPerWeek: (v: number) => void;
  lengthWeeks: number;
  currentWeek: number;
}

const RirProgression = ({
  startingRir,
  setStartingRir,
  rirFloor,
  setRirFloor,
  rirDecrementPerWeek,
  setRirDecrementPerWeek,
  lengthWeeks,
  currentWeek,
}: RirProgressionProps) => {
  const startingRirLocked = currentWeek > 1;

  return (
    <CardGradientSurface gradientId="planSettingsRir" style={styles.panel}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderCopy}>
          <Text style={styles.sectionTitle}>RIR Progression</Text>
          <Text style={styles.sectionSubtitle}>
            Controls how close to failure you train each week.
          </Text>
        </View>
        <View style={styles.intensityBadge}>
          <Ionicons name="flame" size={13} color={COLORS.accent_light} />
          <Text style={styles.intensityBadgeText}>Intensity</Text>
        </View>
      </View>

      {startingRirLocked && (
        <View style={styles.lockHintRow}>
          <Ionicons
            name="lock-closed"
            size={15}
            color={COLORS.accent_muted}
            style={styles.lockHintIcon}
          />
          <Text style={styles.lockHint}>
            Starting RIR is locked after week 1. End this block if you need a new program anchor.
          </Text>
        </View>
      )}

      <Text style={styles.fieldLabel}>Starting RIR (week 1)</Text>
      <View style={styles.buttonRow}>
        {[0, 1, 2, 3, 4, 5].map((v) => (
          <TouchableOpacity
            key={v}
            style={[
              styles.numButton,
              startingRir === v && styles.numButtonSelected,
              startingRirLocked && startingRir !== v && styles.numButtonDisabled,
            ]}
            disabled={startingRirLocked}
            onPress={() => {
              const apply = () => {
                setStartingRir(v);
                if (rirFloor > v) setRirFloor(v);
              };
              if (v <= 1) {
                Alert.alert(
                  `Start at RIR ${v}?`,
                  v === 0
                    ? 'Training to failure from week 1 leaves no room for progression and significantly increases fatigue and injury risk. This is not recommended for most lifters.'
                    : 'Starting at RIR 1 leaves very little room for weekly progression. Most programs start at RIR 3 and work down. Are you sure?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Use RIR ' + v, onPress: apply },
                  ],
                );
              } else {
                apply();
              }
            }}
          >
            <Text style={[styles.numButtonText, startingRir === v && styles.numButtonTextSelected]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: SPACING.lg }]}>RIR Floor (minimum)</Text>
      <View style={styles.buttonRow}>
        {[0, 1, 2, 3].map((v) => (
          <TouchableOpacity
            key={v}
            style={[
              styles.numButton,
              rirFloor === v && styles.numButtonSelected,
              v > startingRir && styles.numButtonDisabled,
            ]}
            onPress={() => v <= startingRir && setRirFloor(v)}
            disabled={v > startingRir}
          >
            <Text style={[
              styles.numButtonText,
              rirFloor === v && styles.numButtonTextSelected,
              v > startingRir && styles.numButtonTextDisabled,
            ]}>{v}{v === 0 ? ' (failure)' : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: SPACING.lg }]}>Intensity Ramp</Text>
      <Text style={styles.fieldHint}>How quickly sets move closer to failure.</Text>
      <View style={styles.buttonRow}>
        {[0.5, 1].map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.rampButton, rirDecrementPerWeek === v && styles.numButtonSelected]}
            onPress={() => setRirDecrementPerWeek(v)}
          >
            <Text style={[styles.rampTitle, rirDecrementPerWeek === v && styles.numButtonTextSelected]}>
              {v === 0.5 ? 'Gradual' : 'Aggressive'}
            </Text>
            <Text style={[styles.rampSubtitle, rirDecrementPerWeek === v && styles.rampSubtitleSelected]}>
              {v === 0.5 ? 'RIR drops every 2 weeks' : 'RIR drops every week'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.rirPreview}>
        <Text style={styles.rirPreviewTitle}>RIR by Week</Text>
        <View style={styles.rirPreviewRow}>
          {Array.from({ length: lengthWeeks }, (_, i) => {
            const week = i + 1;
            const rawRir = startingRir - i * rirDecrementPerWeek;
            const weekRir = Math.max(rirFloor, Math.round(rawRir));
            return (
              <View key={week} style={styles.rirPreviewWeek}>
                <Text style={styles.rirPreviewWeekLabel}>W{week}</Text>
                <Text style={[
                  styles.rirPreviewValue,
                  week === currentWeek && { color: COLORS.accent_primary },
                ]}>
                  {weekRir}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </CardGradientSurface>
  );
};

export default RirProgression;

const styles = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text_primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    lineHeight: 17,
    maxWidth: 260,
  },
  intensityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
    backgroundColor: COLORS.accent_subtle,
    borderWidth: 1,
    borderColor: COLORS.accent_muted,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  intensityBadgeText: {
    color: COLORS.accent_light,
    fontSize: 11,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 13,
    color: COLORS.text_secondary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  fieldHint: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.sm,
  },
  lockHintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.accent_glow,
    borderWidth: 1,
    borderColor: COLORS.accent_subtle,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  lockHintIcon: {
    marginTop: 1,
  },
  lockHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.text_tertiary,
    fontWeight: '400',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  numButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  numButtonSelected: {
    backgroundColor: COLORS.accent_fill,
    borderColor: COLORS.accent_muted,
  },
  numButtonDisabled: {
    opacity: 0.3,
  },
  numButtonText: {
    color: COLORS.text_secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  numButtonTextSelected: {
    color: COLORS.accent_light,
  },
  numButtonTextDisabled: {
    color: COLORS.text_tertiary,
  },
  rampButton: {
    flex: 1,
    minHeight: 50,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  rampTitle: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  rampSubtitle: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },
  rampSubtitleSelected: {
    color: COLORS.accent_light,
  },
  rirPreview: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.bg_card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rirPreviewTitle: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  rirPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rirPreviewWeek: {
    alignItems: 'center',
    minWidth: 26,
  },
  rirPreviewWeekLabel: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    marginBottom: 2,
  },
  rirPreviewValue: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
