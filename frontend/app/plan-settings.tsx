import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { SPLIT_LABELS } from '../src/constants/training';
import SplitBuilder from '../src/components/shared/SplitBuilder';
import VolumeConfigurator from '../src/components/shared/VolumeConfigurator';
import RirProgression from '../src/components/PlanSettings/RirProgression';
import DangerZone from '../src/components/PlanSettings/DangerZone';
import usePlanSettings from '../src/hooks/usePlanSettings';

export default function PlanSettings() {
  const router = useRouter();
  const {
    loading, saving, block,
    splitType, daysPerWeek, lengthWeeks,
    customDays, setCustomDays,
    volumeTargets, setVolumeTargets,
    editingDayIndex, setEditingDayIndex,
    guardrails, setGuardrails,
    expandedGuardrail, setExpandedGuardrail,
    showInfoModal, setShowInfoModal,
    setGuardrailsDirty,
    startingRir, setStartingRir,
    rirFloor, setRirFloor,
    rirDecrementPerWeek, setRirDecrementPerWeek,
    deloadRir, setDeloadRir,
    setLengthWeeks,
    isDirty, handleSave, handleEndBlock,
    handleSplitChange, handleDaysChange,
  } = usePlanSettings();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent_primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!block) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl }}>
          <Text style={styles.emptyText}>No active training block found.</Text>
          <TouchableOpacity style={{ marginTop: SPACING.lg }} onPress={() => router.back()}>
            <Text style={{ color: COLORS.accent_light, fontSize: 16, fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const startDateStr = new Date(block.startDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backArrow}>&#x2190;</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plan Settings</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Overview Card */}
        <View style={styles.overviewCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.overviewTitle}>Block #{block.blockNumber}</Text>
            {block.setupMethod && (
              <View style={styles.methodBadge}>
                <Text style={styles.methodBadgeText}>
                  {block.setupMethod === 'template' ? 'Template' :
                   block.setupMethod === 'plan' ? 'Planned' : 'Build As You Go'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.overviewSub}>
            Week {block.currentWeek} of {lengthWeeks} · Started {startDateStr}
          </Text>
        </View>

        {/* Training Split */}
        <Text style={styles.sectionTitle}>Training Split</Text>
        <View style={styles.optionRow}>
          {(['full_body', 'upper_lower', 'push_pull_legs', 'custom'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.splitOption, splitType === s && styles.splitOptionSelected]}
              onPress={() => handleSplitChange(s)}
            >
              <Text style={[styles.splitOptionText, splitType === s && styles.splitOptionTextSelected]}>
                {SPLIT_LABELS[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {splitType === 'custom' && (
          <SplitBuilder
            customDays={customDays}
            editingDayIndex={editingDayIndex}
            setEditingDayIndex={setEditingDayIndex}
            setCustomDays={setCustomDays}
          />
        )}

        {/* Schedule */}
        <Text style={styles.sectionTitle}>Schedule</Text>
        <Text style={styles.fieldLabel}>Days per week</Text>
        <View style={styles.buttonRow}>
          {[3, 4, 5, 6].map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.numButton, daysPerWeek === d && styles.numButtonSelected]}
              onPress={() => handleDaysChange(d)}
            >
              <Text style={[styles.numButtonText, daysPerWeek === d && styles.numButtonTextSelected]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {splitType === 'push_pull_legs' && (daysPerWeek === 4 || daysPerWeek === 5) && (
          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              Push / Pull / Legs uses a fixed rotation. At 4 or 5 days per week, some weeks won&apos;t be evenly distributed, but it balances out over time.
            </Text>
          </View>
        )}

        <Text style={[styles.fieldLabel, { marginTop: SPACING.lg }]}>Length (weeks)</Text>
        <View style={styles.buttonRow}>
          {[3, 4, 5, 6, 7, 8].map((w) => (
            <TouchableOpacity
              key={w}
              style={[
                styles.numButton,
                lengthWeeks === w && styles.numButtonSelected,
                w < block.currentWeek && styles.numButtonDisabled,
              ]}
              onPress={() => w >= block.currentWeek && setLengthWeeks(w)}
              disabled={w < block.currentWeek}
            >
              <Text style={[
                styles.numButtonText,
                lengthWeeks === w && styles.numButtonTextSelected,
                w < block.currentWeek && styles.numButtonTextDisabled,
              ]}>{w}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <RirProgression
          startingRir={startingRir}
          setStartingRir={setStartingRir}
          rirFloor={rirFloor}
          setRirFloor={setRirFloor}
          rirDecrementPerWeek={rirDecrementPerWeek}
          setRirDecrementPerWeek={setRirDecrementPerWeek}
          deloadRir={deloadRir}
          setDeloadRir={setDeloadRir}
          lengthWeeks={lengthWeeks}
          currentWeek={block.currentWeek}
        />

        <VolumeConfigurator
          volumeTargets={volumeTargets}
          setVolumeTargets={setVolumeTargets}
          guardrails={guardrails}
          setGuardrails={setGuardrails}
          setGuardrailsDirty={setGuardrailsDirty}
          expandedGuardrail={expandedGuardrail}
          setExpandedGuardrail={setExpandedGuardrail}
          showInfoModal={showInfoModal}
          setShowInfoModal={setShowInfoModal}
          subtitle="Sets per muscle group per week"
        />

        <DangerZone onEndBlock={handleEndBlock} />
      </ScrollView>

      {isDirty && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg_primary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  backArrow: {
    fontSize: 24,
    color: COLORS.text_primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text_primary,
  },
  overviewCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.xxl,
  },
  overviewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text_primary,
  },
  overviewSub: {
    fontSize: 13,
    color: COLORS.text_tertiary,
    marginTop: 4,
  },
  methodBadge: {
    backgroundColor: COLORS.accent_subtle,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  methodBadgeText: {
    color: COLORS.accent_light,
    fontSize: 11,
    fontWeight: '600',
  },
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
  infoNote: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  infoNoteText: {
    color: COLORS.text_secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    color: COLORS.text_secondary,
    fontSize: 16,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  splitOption: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  splitOptionSelected: {
    backgroundColor: COLORS.accent_subtle,
    borderColor: COLORS.accent_muted,
  },
  splitOptionText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  splitOptionTextSelected: {
    color: COLORS.accent_light,
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
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    backgroundColor: COLORS.bg_primary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  saveButton: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.text_on_accent,
    fontSize: 16,
    fontWeight: '700',
  },
});
