import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

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
}: RirProgressionProps) => (
  <View>
    <Text style={styles.sectionTitle}>RIR Progression</Text>
    <Text style={{ color: COLORS.text_tertiary, fontSize: 12, marginBottom: SPACING.md }}>
      Controls how close to failure you train each week
    </Text>

    <Text style={styles.fieldLabel}>Starting RIR (week 1)</Text>
    <View style={styles.buttonRow}>
      {[0, 1, 2, 3, 4, 5].map((v) => (
        <TouchableOpacity
          key={v}
          style={[styles.numButton, startingRir === v && styles.numButtonSelected]}
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

    <Text style={[styles.fieldLabel, { marginTop: SPACING.lg }]}>Drop per week</Text>
    <View style={styles.buttonRow}>
      {[0.5, 1].map((v) => (
        <TouchableOpacity
          key={v}
          style={[styles.numButton, rirDecrementPerWeek === v && styles.numButtonSelected]}
          onPress={() => setRirDecrementPerWeek(v)}
        >
          <Text style={[styles.numButtonText, rirDecrementPerWeek === v && styles.numButtonTextSelected]}>
            {v === 0.5 ? '-0.5 / week' : '-1 / week'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <View style={styles.rirPreview}>
      <Text style={styles.rirPreviewTitle}>Weekly progression</Text>
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
  </View>
);

export default RirProgression;

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text_primary,
    marginBottom: SPACING.md,
    marginTop: SPACING.xl,
  },
  fieldLabel: {
    fontSize: 13,
    color: COLORS.text_tertiary,
    marginBottom: SPACING.sm,
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
    backgroundColor: COLORS.accent_subtle,
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
  rirPreview: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
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
