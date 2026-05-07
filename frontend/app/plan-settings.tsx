import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { SPLIT_LABELS } from '../src/constants/training';
import SplitBuilder from '../src/components/shared/SplitBuilder';
import VolumeConfigurator from '../src/components/shared/VolumeConfigurator';
import { CardGradientSurface } from '../src/components/shared/CardGradientSurface';
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
  const splitLocked = (block.workoutSessions || []).some((session) => session.status === 'completed');
  const volumeLocked =
    block.currentWeek > 1 ||
    (block.workoutSessions || []).some((session) => ['in_progress', 'completed'].includes(session.status));
  const isFinalWeek = block.currentWeek >= lengthWeeks;
  const setupLabel = block.setupMethod === 'template'
    ? 'Template'
    : block.setupMethod === 'plan'
      ? 'Planned'
      : 'Build As You Go';

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
        <CardGradientSurface gradientId="planSettingsOverview" style={styles.overviewCard}>
          <View style={styles.overviewTopRow}>
            <View>
              <Text style={styles.overviewEyebrow}>Active block</Text>
              <Text style={styles.overviewTitle}>Block #{block.blockNumber}</Text>
            </View>
            <View style={[styles.methodBadge, isFinalWeek && styles.finalWeekBadge]}>
              <Text style={[styles.methodBadgeText, isFinalWeek && styles.finalWeekBadgeText]}>
                {isFinalWeek ? 'Final week' : setupLabel}
              </Text>
            </View>
          </View>

          <View style={styles.progressHeader}>
            <View style={styles.weekPill}>
              <Text style={styles.weekPillText}>Week {block.currentWeek} of {lengthWeeks}</Text>
              <View style={styles.weekDots}>
                {Array.from({ length: lengthWeeks }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.weekDot,
                      i < block.currentWeek && styles.weekDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.progressDate}>Started {startDateStr}</Text>
          </View>

          <View style={styles.overviewMetaRow}>
            <View style={styles.overviewMetaItem}>
              <Text style={styles.overviewMetaValue}>{daysPerWeek}</Text>
              <Text style={styles.overviewMetaLabel}>days/week</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewMetaItem}>
              <Text style={styles.overviewMetaValue}>{SPLIT_LABELS[splitType]}</Text>
              <Text style={styles.overviewMetaLabel}>split</Text>
            </View>
          </View>
        </CardGradientSurface>

        {/* Training Split */}
        <CardGradientSurface gradientId="planSettingsSplit" style={styles.settingsPanel}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Training Split</Text>
              <Text style={styles.sectionSubtitle}>
                {splitLocked ? 'Locked for this block. Change it after ending the block.' : 'Choose how training days are organized.'}
              </Text>
            </View>
            {splitLocked && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={13} color={COLORS.accent_light} />
                <Text style={styles.lockBadgeText}>Locked</Text>
              </View>
            )}
          </View>

          {splitLocked ? (
            <View style={styles.selectedSplitCard}>
              <View style={styles.selectedSplitIcon}>
                <Ionicons name="barbell" size={18} color={COLORS.accent_light} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedSplitLabel}>{SPLIT_LABELS[splitType]}</Text>
                <Text style={styles.selectedSplitMeta}>{daysPerWeek} training days per week</Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.accent_primary} />
            </View>
          ) : (
            <View style={styles.optionRow}>
              {(['full_body', 'upper_lower', 'push_pull_legs', 'custom'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.splitOption,
                    splitType === s && styles.splitOptionSelected,
                  ]}
                  onPress={() => handleSplitChange(s)}
                >
                  <Text style={[styles.splitOptionText, splitType === s && styles.splitOptionTextSelected]}>
                    {SPLIT_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </CardGradientSurface>

        {splitType === 'custom' && (
          <SplitBuilder
            customDays={customDays}
            editingDayIndex={editingDayIndex}
            setEditingDayIndex={setEditingDayIndex}
            setCustomDays={setCustomDays}
          />
        )}

        {/* Schedule */}
        <CardGradientSurface gradientId="planSettingsSchedule" style={styles.settingsPanel}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Schedule</Text>
              <Text style={styles.sectionSubtitle}>Set weekly frequency and block length.</Text>
            </View>
          </View>
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
              <Ionicons name="sync" size={14} color={COLORS.accent_light} style={styles.infoNoteIcon} />
              <Text style={styles.infoNoteText}>
                Push / Pull / Legs rotates continuously, so uneven weeks balance out over time.
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
        </CardGradientSurface>

        <RirProgression
          startingRir={startingRir}
          setStartingRir={setStartingRir}
          rirFloor={rirFloor}
          setRirFloor={setRirFloor}
          rirDecrementPerWeek={rirDecrementPerWeek}
          setRirDecrementPerWeek={setRirDecrementPerWeek}
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
          subtitle="Week 1 set targets for each muscle group. Future weeks progress automatically."
          locked={volumeLocked}
          currentWeek={block.currentWeek}
          lengthWeeks={lengthWeeks}
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
    backgroundColor: COLORS.bg_card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  overviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  overviewEyebrow: {
    color: COLORS.accent_light,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  overviewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text_primary,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  progressDate: {
    fontSize: 13,
    color: COLORS.text_secondary,
  },
  weekPill: {
    flexShrink: 1,
  },
  weekPillText: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  weekDots: {
    flexDirection: 'row',
    gap: 5,
  },
  weekDot: {
    width: 18,
    height: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(242, 240, 237, 0.08)',
  },
  weekDotActive: {
    backgroundColor: 'rgba(232, 145, 45, 0.42)',
  },
  overviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  overviewMetaItem: {
    flex: 1,
  },
  overviewMetaValue: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '700',
  },
  overviewMetaLabel: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    marginTop: 2,
  },
  overviewDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border_subtle,
    marginHorizontal: SPACING.md,
  },
  methodBadge: {
    backgroundColor: COLORS.accent_subtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.accent_muted,
  },
  methodBadgeText: {
    color: COLORS.accent_light,
    fontSize: 11,
    fontWeight: '700',
  },
  finalWeekBadge: {
    backgroundColor: COLORS.gold_subtle,
    borderColor: COLORS.gold_primary,
  },
  finalWeekBadgeText: {
    color: COLORS.gold_light,
  },
  settingsPanel: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text_primary,
    marginBottom: 4,
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
  sectionSubtitle: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    lineHeight: 17,
  },
  fieldLabel: {
    fontSize: 13,
    color: COLORS.text_secondary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    backgroundColor: COLORS.accent_glow,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent_subtle,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  infoNoteIcon: {
    marginTop: 2,
  },
  infoNoteText: {
    flex: 1,
    color: COLORS.text_secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  lockBadge: {
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
  lockBadgeText: {
    color: COLORS.accent_light,
    fontSize: 11,
    fontWeight: '700',
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
    backgroundColor: COLORS.accent_fill,
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
  selectedSplitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent_muted,
    padding: SPACING.md,
  },
  selectedSplitIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent_subtle,
    borderWidth: 1,
    borderColor: COLORS.accent_muted,
  },
  selectedSplitLabel: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '700',
  },
  selectedSplitMeta: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    marginTop: 2,
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
