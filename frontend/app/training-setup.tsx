import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { apiPost, apiGet } from '../src/utils/api';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import {
  SPLIT_LABELS, SPLIT_SUGGESTIONS, ALL_MUSCLE_GROUPS,
  MUSCLE_LABELS, VOLUME_DEFAULTS, DEFAULT_VOLUME_GUARDRAILS,
} from '../src/constants/training';

type SetupPath = 'choose' | 'template_browse' | 'template_detail' | 'plan' | 'plan_volume' | 'build_as_you_go';

interface Template {
  id: string;
  name: string;
  description: string;
  splitType: string;
  daysPerWeek: number;
  lengthWeeks: number;
  difficulty: string;
  days: any[];
}

export default function TrainingSetup() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [screen, setScreen] = useState<SetupPath>('choose');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [dayOrder, setDayOrder] = useState<number[]>([]);

  // Plan state — pre-fill days from onboarding
  const userDays = user?.daysPerWeek || 4;
  const [daysPerWeek, setDaysPerWeek] = useState(userDays);
  const [splitType, setSplitType] = useState(SPLIT_SUGGESTIONS[userDays] || 'upper_lower');
  const [customDays, setCustomDays] = useState<{ dayLabel: string; muscleGroups: string[] }[]>([]);
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [volumeTargets, setVolumeTargets] = useState<Record<string, number>>(
    VOLUME_DEFAULTS[user?.experienceLevel || 'intermediate']
  );
  const [guardrails, setGuardrails] = useState<Record<string, { mev: number; mrv: number }>>(
    { ...DEFAULT_VOLUME_GUARDRAILS }
  );
  const [expandedGuardrail, setExpandedGuardrail] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const handleDaysChange = (days: number) => {
    setDaysPerWeek(days);
    setSplitType(SPLIT_SUGGESTIONS[days] || 'upper_lower');
    if (customDays.length !== days) {
      setCustomDays(
        Array.from({ length: days }, (_, i) => ({
          dayLabel: `Day ${i + 1}`,
          muscleGroups: [],
        }))
      );
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await apiGet('/training/templates');
      const data = await res.json();
      if (res.ok) setTemplates(data.templates);
    } catch (err) {
      Alert.alert('Error', 'Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const applyTemplate = async (template: Template) => {
    setIsSubmitting(true);
    try {
      // First create the mesocycle
      const createRes = await apiPost('/training/mesocycle/create', {
        splitType: template.splitType,
        daysPerWeek: template.daysPerWeek,
        setupMethod: 'template',
        lengthWeeks: template.lengthWeeks,
      });
      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || 'Failed to create mesocycle');
      }

      // Then apply the template with reordered days
      const applyRes = await apiPost(`/training/templates/${template.id}/apply`, { dayOrder });
      if (!applyRes.ok) {
        const err = await applyRes.json();
        throw new Error(err.error || 'Failed to apply template');
      }

      await refreshUser();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const createMesocycle = async (setupMethod: 'plan' | 'build_as_you_go') => {
    setIsSubmitting(true);
    try {
      const body: Record<string, any> = {
        splitType,
        daysPerWeek,
        setupMethod,
        lengthWeeks: 5,
      };
      if (splitType === 'custom') {
        body.customDays = customDays;
      }
      if (setupMethod === 'plan') {
        body.volumeTargets = volumeTargets;
      }

      const res = await apiPost('/training/mesocycle/create', body);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create mesocycle');
      }

      await refreshUser();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const OptionButton = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.optionButton, selected && styles.optionButtonSelected]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* PATH CHOOSER */}
        {screen === 'choose' && (
          <View>
            <Text style={styles.headerTitle}>Set Up Your Training</Text>
            <Text style={styles.headerSubtitle}>How would you like to build your program?</Text>

            <TouchableOpacity
              style={styles.pathCard}
              onPress={() => {
                loadTemplates();
                setScreen('template_browse');
              }}
            >
              <Text style={styles.pathTitle}>Pick a Template</Text>
              <Text style={styles.pathDesc}>
                Choose from pre-built programs designed for different goals and experience levels. Great if you want a proven structure.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pathCard}
              onPress={() => setScreen('plan')}
            >
              <Text style={styles.pathTitle}>Build Your Mesocycle</Text>
              <Text style={styles.pathDesc}>
                Choose your split, adjust volume per muscle group, and customize everything. For lifters who know what they want.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pathCard}
              onPress={() => setScreen('build_as_you_go')}
            >
              <Text style={styles.pathTitle}>Build As You Go</Text>
              <Text style={styles.pathDesc}>
                Just pick a split and start training. Build each workout day by day, the app tracks your volume automatically.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TEMPLATE BROWSE */}
        {screen === 'template_browse' && (
          <View>
            <Text style={styles.headerTitle}>Program Templates</Text>
            <Text style={styles.headerSubtitle}>Tap a program to see details</Text>

            {loadingTemplates ? (
              <ActivityIndicator size="large" color={COLORS.accent_primary} style={{ marginTop: 40 }} />
            ) : (
              templates.map((t) => {
                // Calculate total weekly sets from template days
                const totalSets = (t.days as any[]).reduce((sum: number, day: any) =>
                  sum + day.exercises.reduce((s: number, ex: any) => s + (ex.sets || 0), 0), 0);

                return (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.templateCard}
                    onPress={() => {
                      setSelectedTemplate(t);
                      setDayOrder((t.days as any[]).map((_: any, i: number) => i));
                      setScreen('template_detail');
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.templateName}>{t.name}</Text>
                      <View style={styles.setsBadge}>
                        <Text style={styles.setsBadgeText}>{totalSets} sets/wk</Text>
                      </View>
                    </View>
                    <Text style={styles.templateDesc}>{t.description}</Text>
                    <View style={styles.templateMeta}>
                      <Text style={styles.templateMetaText}>{SPLIT_LABELS[t.splitType] || t.splitType}</Text>
                      <Text style={styles.templateMetaDot}> · </Text>
                      <Text style={styles.templateMetaText}>{t.daysPerWeek} days/week</Text>
                      <Text style={styles.templateMetaDot}> · </Text>
                      <Text style={styles.templateMetaText}>{t.lengthWeeks} weeks</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* TEMPLATE DETAIL */}
        {screen === 'template_detail' && selectedTemplate && (() => {
          const totalSets = (selectedTemplate.days as any[]).reduce((sum: number, day: any) =>
            sum + day.exercises.reduce((s: number, ex: any) => s + (ex.sets || 0), 0), 0);
          const totalExercises = (selectedTemplate.days as any[]).reduce((sum: number, day: any) =>
            sum + day.exercises.length, 0);

          return (
          <View>
            <Text style={styles.headerTitle}>{selectedTemplate.name}</Text>
            <Text style={styles.headerSubtitle}>{selectedTemplate.description}</Text>

            <View style={styles.detailMeta}>
              <View style={styles.detailMetaItem}>
                <Text style={styles.detailMetaLabel}>Split</Text>
                <Text style={styles.detailMetaValue}>{SPLIT_LABELS[selectedTemplate.splitType]}</Text>
              </View>
              <View style={styles.detailMetaItem}>
                <Text style={styles.detailMetaLabel}>Days</Text>
                <Text style={styles.detailMetaValue}>{selectedTemplate.daysPerWeek}/week</Text>
              </View>
              <View style={styles.detailMetaItem}>
                <Text style={styles.detailMetaLabel}>Sets/Week</Text>
                <Text style={styles.detailMetaValue}>{totalSets}</Text>
              </View>
              <View style={styles.detailMetaItem}>
                <Text style={styles.detailMetaLabel}>Exercises</Text>
                <Text style={styles.detailMetaValue}>{totalExercises}</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Weekly Schedule</Text>
            <Text style={{ color: COLORS.text_tertiary, fontSize: 13, marginBottom: SPACING.md, marginTop: -SPACING.sm }}>
              Reorder days to match your preferred schedule
            </Text>
            {dayOrder.map((origIdx, displayIdx) => {
              const day = (selectedTemplate.days as any[])[origIdx];
              if (!day) return null;
              return (
                <View key={origIdx} style={styles.dayCard}>
                  <View style={styles.dayCardHeader}>
                    <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                    <View style={styles.reorderButtons}>
                      <TouchableOpacity
                        style={[styles.reorderBtn, displayIdx === 0 && styles.reorderBtnDisabled]}
                        disabled={displayIdx === 0}
                        onPress={() => {
                          const newOrder = [...dayOrder];
                          [newOrder[displayIdx - 1], newOrder[displayIdx]] = [newOrder[displayIdx], newOrder[displayIdx - 1]];
                          setDayOrder(newOrder);
                        }}
                      >
                        <Text style={[styles.reorderBtnText, displayIdx === 0 && styles.reorderBtnTextDisabled]}>▲</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reorderBtn, displayIdx === dayOrder.length - 1 && styles.reorderBtnDisabled]}
                        disabled={displayIdx === dayOrder.length - 1}
                        onPress={() => {
                          const newOrder = [...dayOrder];
                          [newOrder[displayIdx], newOrder[displayIdx + 1]] = [newOrder[displayIdx + 1], newOrder[displayIdx]];
                          setDayOrder(newOrder);
                        }}
                      >
                        <Text style={[styles.reorderBtnText, displayIdx === dayOrder.length - 1 && styles.reorderBtnTextDisabled]}>▼</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {day.exercises.map((ex: any, j: number) => (
                    <View key={j} style={styles.exerciseRow}>
                      <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                      <Text style={styles.exerciseSets}>{ex.sets}x{ex.repRangeLow}-{ex.repRangeHigh}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
          );
        })()}

        {/* BUILD YOUR MESOCYCLE - Split Selection */}
        {screen === 'plan' && (
          <View>
            <Text style={styles.headerTitle}>Build Your Mesocycle</Text>
            <Text style={styles.headerSubtitle}>Training {daysPerWeek} days per week, choose your split</Text>

            <Text style={styles.sectionTitle}>Training Split</Text>
            {(['full_body', 'upper_lower', 'push_pull_legs', 'custom'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.bigOption, splitType === s && styles.bigOptionSelected]}
                onPress={() => {
                  setSplitType(s);
                  if (s === 'custom' && customDays.length !== daysPerWeek) {
                    setCustomDays(
                      Array.from({ length: daysPerWeek }, (_, i) => ({
                        dayLabel: `Day ${i + 1}`,
                        muscleGroups: [],
                      }))
                    );
                  }
                  setEditingDayIndex(null);
                }}
              >
                <Text style={[styles.bigOptionTitle, splitType === s && styles.bigOptionTitleSelected]}>
                  {SPLIT_LABELS[s]}
                </Text>
                {s === 'custom' && (
                  <Text style={styles.bigOptionDesc}>Name your days and assign muscle groups</Text>
                )}
              </TouchableOpacity>
            ))}

            {/* Custom split day builder */}
            {splitType === 'custom' && (
              <View style={{ marginTop: SPACING.lg }}>
                <Text style={styles.sectionTitle}>Your Days</Text>
                {customDays.map((day, dayIdx) => (
                  <View key={dayIdx} style={[styles.bigOption, editingDayIndex === dayIdx && styles.bigOptionSelected, { marginBottom: SPACING.md }]}>
                    <TouchableOpacity
                      onPress={() => setEditingDayIndex(editingDayIndex === dayIdx ? null : dayIdx)}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.bigOptionTitle, editingDayIndex === dayIdx && styles.bigOptionTitleSelected]}>
                          {day.dayLabel}
                        </Text>
                        <Text style={{ color: COLORS.text_tertiary, fontSize: 11 }}>
                          {day.muscleGroups.length > 0
                            ? day.muscleGroups.map((m) => MUSCLE_LABELS[m] || m).join(', ')
                            : 'Tap to set up'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {editingDayIndex === dayIdx && (
                      <View style={{ marginTop: SPACING.md }}>
                        <TextInput
                          style={[styles.input, { marginBottom: SPACING.md }]}
                          placeholder="Day name (e.g., Chest & Triceps)"
                          placeholderTextColor={COLORS.text_tertiary}
                          value={day.dayLabel}
                          onChangeText={(text) => {
                            const updated = [...customDays];
                            updated[dayIdx] = { ...updated[dayIdx], dayLabel: text };
                            setCustomDays(updated);
                          }}
                        />
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
                          {ALL_MUSCLE_GROUPS.map((muscle) => {
                            const isSelected = day.muscleGroups.includes(muscle);
                            return (
                              <TouchableOpacity
                                key={muscle}
                                style={[styles.optionButton, isSelected && styles.optionButtonSelected, { marginBottom: 4 }]}
                                onPress={() => {
                                  const updated = [...customDays];
                                  const muscles = isSelected
                                    ? day.muscleGroups.filter((m) => m !== muscle)
                                    : [...day.muscleGroups, muscle];
                                  updated[dayIdx] = { ...updated[dayIdx], muscleGroups: muscles };
                                  setCustomDays(updated);
                                }}
                              >
                                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                  {MUSCLE_LABELS[muscle]}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* BUILD YOUR MESOCYCLE - Volume Targets */}
        {screen === 'plan_volume' && (
          <View>
            <Text style={styles.headerTitle}>Weekly Volume</Text>
            <Text style={styles.headerSubtitle}>
              Sets per muscle group per week. Adjust based on your recovery capacity.
            </Text>

            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Volume Targets</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <View style={styles.infoButton}>
                  <Text style={styles.infoButtonText}>i</Text>
                </View>
              </TouchableOpacity>
            </View>

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
                          MEV {guard.mev}, MRV {guard.mrv} <Text style={styles.editHint}>(edit)</Text>
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
                        value < guard.mev && value > 0 && { color: COLORS.warning },
                        value > guard.mrv && { color: COLORS.danger },
                      ]}>
                        {value}
                      </Text>
                      <TouchableOpacity
                        style={styles.volumeBtn}
                        onPress={() => {
                          const newVal = Math.min(guard.mrv + 2, value + 2);
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
                        <Text style={styles.guardrailLabel}>MEV</Text>
                        <TouchableOpacity
                          style={styles.guardrailBtn}
                          onPress={() => {
                            const newMev = Math.max(0, guard.mev - 1);
                            if (newMev < guard.mrv) {
                              const updated = { ...guardrails, [muscle]: { ...guard, mev: newMev } };
                              setGuardrails(updated);
                              if (value > 0 && value < newMev) {
                                setVolumeTargets({ ...volumeTargets, [muscle]: newMev });
                              }
                            }
                          }}
                        >
                          <Text style={styles.guardrailBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.guardrailValue}>{guard.mev}</Text>
                        <TouchableOpacity
                          style={styles.guardrailBtn}
                          onPress={() => {
                            const newMev = guard.mev + 1;
                            if (newMev < guard.mrv) {
                              const updated = { ...guardrails, [muscle]: { ...guard, mev: newMev } };
                              setGuardrails(updated);
                              if (value > 0 && value < newMev) {
                                setVolumeTargets({ ...volumeTargets, [muscle]: newMev });
                              }
                            }
                          }}
                        >
                          <Text style={styles.guardrailBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.guardrailRow}>
                        <Text style={styles.guardrailLabel}>MRV</Text>
                        <TouchableOpacity
                          style={styles.guardrailBtn}
                          onPress={() => {
                            const newMrv = guard.mrv - 1;
                            if (newMrv > guard.mev) {
                              const updated = { ...guardrails, [muscle]: { ...guard, mrv: newMrv } };
                              setGuardrails(updated);
                              if (value > newMrv) {
                                setVolumeTargets({ ...volumeTargets, [muscle]: newMrv });
                              }
                            }
                          }}
                        >
                          <Text style={styles.guardrailBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.guardrailValue}>{guard.mrv}</Text>
                        <TouchableOpacity
                          style={styles.guardrailBtn}
                          onPress={() => {
                            const newMrv = guard.mrv + 1;
                            const updated = { ...guardrails, [muscle]: { ...guard, mrv: newMrv } };
                            setGuardrails(updated);
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
          </View>
        )}

        {/* MEV/MRV Info Modal */}
        <Modal visible={showInfoModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Volume Guardrails</Text>
              <Text style={styles.modalBody}>
                <Text style={styles.modalBold}>MEV (Minimum Effective Volume)</Text>
                {'\n'}The fewest weekly sets per muscle group that still produce measurable growth. Going below MEV means you're likely not providing enough stimulus.
              </Text>
              <Text style={[styles.modalBody, { marginTop: SPACING.md }]}>
                <Text style={styles.modalBold}>MRV (Maximum Recoverable Volume)</Text>
                {'\n'}The most weekly sets you can handle while still recovering between sessions. Exceeding MRV leads to accumulated fatigue and potential regression.
              </Text>
              <Text style={[styles.modalBody, { marginTop: SPACING.md, color: COLORS.text_tertiary }]}>
                Advanced lifters can customize these values by tapping the MEV/MRV numbers next to each muscle group.
              </Text>
              <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowInfoModal(false)}>
                <Text style={styles.modalDismissText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* BUILD AS YOU GO - Split Selection */}
        {screen === 'build_as_you_go' && (
          <View>
            <Text style={styles.headerTitle}>Build As You Go</Text>
            <Text style={styles.headerSubtitle}>
              Training {daysPerWeek} days per week, choose a split and start. You'll build each workout when you're ready.
            </Text>

            <Text style={styles.sectionTitle}>Training Split</Text>
            {(['full_body', 'upper_lower', 'push_pull_legs', 'custom'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.bigOption, splitType === s && styles.bigOptionSelected]}
                onPress={() => {
                  setSplitType(s);
                  if (s === 'custom' && customDays.length !== daysPerWeek) {
                    setCustomDays(
                      Array.from({ length: daysPerWeek }, (_, i) => ({
                        dayLabel: `Day ${i + 1}`,
                        muscleGroups: [],
                      }))
                    );
                  }
                  setEditingDayIndex(null);
                }}
              >
                <Text style={[styles.bigOptionTitle, splitType === s && styles.bigOptionTitleSelected]}>
                  {SPLIT_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Custom split day builder (same as plan) */}
            {splitType === 'custom' && (
              <View style={{ marginTop: SPACING.lg }}>
                <Text style={styles.sectionTitle}>Your Days</Text>
                {customDays.map((day, dayIdx) => (
                  <View key={dayIdx} style={[styles.bigOption, editingDayIndex === dayIdx && styles.bigOptionSelected, { marginBottom: SPACING.md }]}>
                    <TouchableOpacity
                      onPress={() => setEditingDayIndex(editingDayIndex === dayIdx ? null : dayIdx)}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.bigOptionTitle, editingDayIndex === dayIdx && styles.bigOptionTitleSelected]}>
                          {day.dayLabel}
                        </Text>
                        <Text style={{ color: COLORS.text_tertiary, fontSize: 11 }}>
                          {day.muscleGroups.length > 0
                            ? day.muscleGroups.map((m) => MUSCLE_LABELS[m] || m).join(', ')
                            : 'Tap to set up'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {editingDayIndex === dayIdx && (
                      <View style={{ marginTop: SPACING.md }}>
                        <TextInput
                          style={[styles.input, { marginBottom: SPACING.md }]}
                          placeholder="Day name (e.g., Chest & Triceps)"
                          placeholderTextColor={COLORS.text_tertiary}
                          value={day.dayLabel}
                          onChangeText={(text) => {
                            const updated = [...customDays];
                            updated[dayIdx] = { ...updated[dayIdx], dayLabel: text };
                            setCustomDays(updated);
                          }}
                        />
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
                          {ALL_MUSCLE_GROUPS.map((muscle) => {
                            const isSelected = day.muscleGroups.includes(muscle);
                            return (
                              <TouchableOpacity
                                key={muscle}
                                style={[styles.optionButton, isSelected && styles.optionButtonSelected, { marginBottom: 4 }]}
                                onPress={() => {
                                  const updated = [...customDays];
                                  const muscles = isSelected
                                    ? day.muscleGroups.filter((m) => m !== muscle)
                                    : [...day.muscleGroups, muscle];
                                  updated[dayIdx] = { ...updated[dayIdx], muscleGroups: muscles };
                                  setCustomDays(updated);
                                }}
                              >
                                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                  {MUSCLE_LABELS[muscle]}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        {screen !== 'choose' && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (screen === 'template_detail') setScreen('template_browse');
              else if (screen === 'plan_volume') setScreen('plan');
              else setScreen('choose');
            }}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        {/* Template detail: apply button */}
        {screen === 'template_detail' && selectedTemplate && (
          <TouchableOpacity
            style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
            onPress={() => applyTemplate(selectedTemplate)}
            disabled={isSubmitting}
          >
            <Text style={styles.nextButtonText}>
              {isSubmitting ? 'Setting up...' : 'Use This Program'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Plan: continue to volume */}
        {screen === 'plan' && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => {
              if (splitType === 'custom') {
                for (const day of customDays) {
                  if (!day.dayLabel.trim() || day.muscleGroups.length === 0) {
                    Alert.alert('Hold on', 'Each day needs a name and at least one muscle group');
                    return;
                  }
                }
              }
              setScreen('plan_volume');
            }}
          >
            <Text style={styles.nextButtonText}>Set Volume</Text>
          </TouchableOpacity>
        )}

        {/* Plan volume: create */}
        {screen === 'plan_volume' && (
          <TouchableOpacity
            style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
            onPress={() => createMesocycle('plan')}
            disabled={isSubmitting}
          >
            <Text style={styles.nextButtonText}>
              {isSubmitting ? 'Creating...' : 'Start Mesocycle'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Build as you go: create */}
        {screen === 'build_as_you_go' && (
          <TouchableOpacity
            style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
            onPress={() => {
              if (splitType === 'custom') {
                for (const day of customDays) {
                  if (!day.dayLabel.trim() || day.muscleGroups.length === 0) {
                    Alert.alert('Hold on', 'Each day needs a name and at least one muscle group');
                    return;
                  }
                }
              }
              createMesocycle('build_as_you_go');
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
  pathCard: {
    padding: SPACING.xl,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.md,
  },
  pathTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent_light,
    marginBottom: SPACING.sm,
  },
  pathDesc: {
    fontSize: 14,
    color: COLORS.text_secondary,
    lineHeight: 20,
  },
  templateCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.md,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text_primary,
    flex: 1,
  },
  templateDesc: {
    fontSize: 13,
    color: COLORS.text_secondary,
    marginTop: 6,
    lineHeight: 18,
  },
  templateMeta: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  templateMetaText: {
    fontSize: 12,
    color: COLORS.text_tertiary,
  },
  templateMetaDot: {
    color: COLORS.text_tertiary,
    fontSize: 12,
  },
  setsBadge: {
    backgroundColor: COLORS.accent_subtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  setsBadgeText: {
    color: COLORS.accent_light,
    fontSize: 11,
    fontWeight: '600',
  },
  detailMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  detailMetaItem: {
    flex: 1,
    minWidth: '40%' as any,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  detailMetaLabel: {
    fontSize: 11,
    color: COLORS.text_tertiary,
    marginBottom: 4,
  },
  detailMetaValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text_primary,
  },
  dayCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accent_light,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  reorderBtn: {
    width: 30,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.bg_input,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  reorderBtnText: {
    fontSize: 12,
    color: COLORS.text_primary,
  },
  reorderBtnTextDisabled: {
    color: COLORS.text_tertiary,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  exerciseName: {
    fontSize: 13,
    color: COLORS.text_secondary,
    flex: 1,
  },
  exerciseSets: {
    fontSize: 13,
    color: COLORS.text_tertiary,
    fontWeight: '600',
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    marginTop: SPACING.xl,
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
  editHint: {
    color: COLORS.accent_muted,
    fontSize: 10,
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
    width: 30,
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
  optionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  optionButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.accent_subtle,
    borderColor: COLORS.accent_muted,
  },
  optionText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: COLORS.accent_light,
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
  input: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    fontSize: 16,
    color: COLORS.text_primary,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
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
});
