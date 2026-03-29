import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { SPLIT_LABELS } from '../src/constants/training';
import { useTrainingSetup } from '../src/hooks/useTrainingSetup';
import PathChooser from '../src/components/TrainingSetup/PathChooser';
import { TemplateBrowse, TemplateDetail } from '../src/components/TrainingSetup/TemplateBrowser';
import SplitBuilder from '../src/components/shared/SplitBuilder';
import VolumeConfigurator from '../src/components/shared/VolumeConfigurator';

export default function TrainingSetup() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const {
    screen, setScreen, isSubmitting,
    templates, loadingTemplates,
    selectedTemplate, setSelectedTemplate,
    dayOrder, setDayOrder,
    templateLengthWeeks, setTemplateLengthWeeks,
    templateStartingRir, setTemplateStartingRir,
    templateRirFloor, setTemplateRirFloor,
    templateDeloadRir, setTemplateDeloadRir,
    daysPerWeek, splitType, customDays,
    editingDayIndex, setEditingDayIndex, setCustomDays,
    volumeTargets, setVolumeTargets,
    guardrails, setGuardrails,
    expandedGuardrail, setExpandedGuardrail,
    showInfoModal, setShowInfoModal,
    loadTemplates, applyTemplate, createTrainingBlock,
    handleSplitSelect, validateCustomDays,
  } = useTrainingSetup({ user, refreshUser, router });

  const renderSplitOptions = (screenTitle: string, subtitle: string) => (
    <View>
      <Text style={styles.headerTitle}>{screenTitle}</Text>
      <Text style={styles.headerSubtitle}>{subtitle}</Text>

      <Text style={styles.sectionTitle}>Training Split</Text>
      {(['full_body', 'upper_lower', 'push_pull_legs', 'custom'] as const).map((s) => (
        <TouchableOpacity
          key={s}
          style={[styles.bigOption, splitType === s && styles.bigOptionSelected]}
          onPress={() => handleSplitSelect(s)}
        >
          <Text style={[styles.bigOptionTitle, splitType === s && styles.bigOptionTitleSelected]}>
            {SPLIT_LABELS[s]}
          </Text>
          {s === 'custom' && (
            <Text style={styles.bigOptionDesc}>Name your days and assign muscle groups</Text>
          )}
        </TouchableOpacity>
      ))}

      {splitType === 'custom' && (
        <SplitBuilder
          customDays={customDays}
          editingDayIndex={editingDayIndex}
          setEditingDayIndex={setEditingDayIndex}
          setCustomDays={setCustomDays}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {screen === 'choose' && (
          <PathChooser
            onTemplate={() => {
              loadTemplates();
              setScreen('template_browse');
            }}
            onPlan={() => setScreen('plan')}
            onBuildAsYouGo={() => setScreen('build_as_you_go')}
          />
        )}

        {screen === 'template_browse' && (
          <TemplateBrowse
            templates={templates}
            loading={loadingTemplates}
            onSelect={(t) => {
              setSelectedTemplate(t);
              setDayOrder((t.days as any[]).map((_: any, i: number) => i));
              setScreen('template_detail');
            }}
          />
        )}

        {screen === 'template_detail' && selectedTemplate && (
          <TemplateDetail
            template={selectedTemplate}
            dayOrder={dayOrder}
            setDayOrder={setDayOrder}
          />
        )}

        {screen === 'template_customize' && selectedTemplate && (
          <View>
            <Text style={styles.headerTitle}>Customize Program</Text>
            <Text style={styles.headerSubtitle}>
              Adjust {selectedTemplate.name} to your preferences
            </Text>

            <Text style={styles.sectionTitle}>Block Length</Text>
            <View style={styles.optionRow}>
              {[4, 5, 6, 7, 8].map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.optionPill, templateLengthWeeks === w && styles.optionPillSelected]}
                  onPress={() => setTemplateLengthWeeks(w)}
                >
                  <Text style={[styles.optionPillText, templateLengthWeeks === w && styles.optionPillTextSelected]}>
                    {w} weeks
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Starting RIR</Text>
            <Text style={styles.settingDesc}>Reps in reserve for week 1</Text>
            <View style={styles.optionRow}>
              {[4, 3, 2, 1].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.optionPill, templateStartingRir === r && styles.optionPillSelected]}
                  onPress={() => setTemplateStartingRir(r)}
                >
                  <Text style={[styles.optionPillText, templateStartingRir === r && styles.optionPillTextSelected]}>
                    RIR {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>RIR Floor</Text>
            <Text style={styles.settingDesc}>Lowest RIR before deload week</Text>
            <View style={styles.optionRow}>
              {[2, 1, 0].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.optionPill, templateRirFloor === r && styles.optionPillSelected]}
                  onPress={() => setTemplateRirFloor(r)}
                >
                  <Text style={[styles.optionPillText, templateRirFloor === r && styles.optionPillTextSelected]}>
                    RIR {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Deload RIR</Text>
            <Text style={styles.settingDesc}>RIR for the final recovery week</Text>
            <View style={styles.optionRow}>
              {[5, 6, 7].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.optionPill, templateDeloadRir === r && styles.optionPillSelected]}
                  onPress={() => setTemplateDeloadRir(r)}
                >
                  <Text style={[styles.optionPillText, templateDeloadRir === r && styles.optionPillTextSelected]}>
                    RIR {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {screen === 'plan' && renderSplitOptions(
          'Build Your Training Block',
          `Training ${daysPerWeek} days per week, choose your split`,
        )}

        {screen === 'plan_volume' && (
          <View>
            <Text style={styles.headerTitle}>Weekly Volume</Text>
            <Text style={styles.headerSubtitle}>
              Sets per muscle group per week. Adjust based on your recovery capacity.
            </Text>
            <VolumeConfigurator
              volumeTargets={volumeTargets}
              setVolumeTargets={setVolumeTargets}
              guardrails={guardrails}
              setGuardrails={setGuardrails}
              expandedGuardrail={expandedGuardrail}
              setExpandedGuardrail={setExpandedGuardrail}
              showInfoModal={showInfoModal}
              setShowInfoModal={setShowInfoModal}
            />
          </View>
        )}

        {screen === 'build_as_you_go' && renderSplitOptions(
          'Build As You Go',
          `Training ${daysPerWeek} days per week, choose a split and start. You'll build each workout when you're ready.`,
        )}

      </ScrollView>

      <View style={styles.navRow}>
        {screen !== 'choose' && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (screen === 'template_detail') setScreen('template_browse');
              else if (screen === 'template_customize') setScreen('template_detail');
              else if (screen === 'plan_volume') setScreen('plan');
              else setScreen('choose');
            }}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        {screen === 'template_detail' && selectedTemplate && (
          <>
            <TouchableOpacity
              style={[styles.nextButton, { flex: 1, backgroundColor: COLORS.bg_elevated, borderWidth: 1, borderColor: COLORS.border }, isSubmitting && styles.buttonDisabled]}
              onPress={() => {
                setTemplateLengthWeeks(selectedTemplate.lengthWeeks);
                setScreen('template_customize');
              }}
              disabled={isSubmitting}
            >
              <Text style={[styles.nextButtonText, { color: COLORS.text_primary }]}>Customize</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
              onPress={() => applyTemplate(selectedTemplate)}
              disabled={isSubmitting}
            >
              <Text style={styles.nextButtonText}>
                {isSubmitting ? 'Setting up...' : 'Use Defaults'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {screen === 'template_customize' && selectedTemplate && (
          <TouchableOpacity
            style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
            onPress={() => applyTemplate(selectedTemplate, true)}
            disabled={isSubmitting}
          >
            <Text style={styles.nextButtonText}>
              {isSubmitting ? 'Setting up...' : 'Apply Program'}
            </Text>
          </TouchableOpacity>
        )}

        {screen === 'plan' && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => {
              if (validateCustomDays()) setScreen('plan_volume');
            }}
          >
            <Text style={styles.nextButtonText}>Set Volume</Text>
          </TouchableOpacity>
        )}

        {screen === 'plan_volume' && (
          <TouchableOpacity
            style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
            onPress={() => createTrainingBlock('plan')}
            disabled={isSubmitting}
          >
            <Text style={styles.nextButtonText}>
              {isSubmitting ? 'Creating...' : 'Start Block'}
            </Text>
          </TouchableOpacity>
        )}

        {screen === 'build_as_you_go' && (
          <TouchableOpacity
            style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
            onPress={() => {
              if (validateCustomDays()) createTrainingBlock('build_as_you_go');
            }}
            disabled={isSubmitting}
          >
            <Text style={styles.nextButtonText}>
              {isSubmitting ? 'Creating...' : 'Start Training'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg_primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xl,
  },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text_primary,
    marginBottom: SPACING.md,
    marginTop: SPACING.xl,
  },
  bigOption: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.sm,
  },
  bigOptionSelected: {
    backgroundColor: COLORS.accent_subtle,
    borderColor: COLORS.accent_muted,
  },
  bigOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text_primary,
  },
  bigOptionTitleSelected: {
    color: COLORS.accent_light,
  },
  bigOptionDesc: {
    fontSize: 13,
    color: COLORS.text_tertiary,
    marginTop: 4,
  },
  navRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  backButton: {
    flex: 1,
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backButtonText: {
    color: COLORS.text_secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
  },
  nextButtonText: {
    color: COLORS.text_on_accent,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  optionPill: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  optionPillSelected: {
    backgroundColor: COLORS.accent_subtle,
    borderColor: COLORS.accent_muted,
  },
  optionPillText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  optionPillTextSelected: {
    color: COLORS.accent_light,
  },
  settingDesc: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    marginBottom: SPACING.sm,
    marginTop: -SPACING.xs,
  },
});
