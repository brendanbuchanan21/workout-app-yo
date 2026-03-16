import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, TextInput, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiGet, apiPut, apiPost } from '../src/utils/api';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import {
  SPLIT_LABELS, ALL_MUSCLE_GROUPS, MUSCLE_LABELS, DEFAULT_VOLUME_GUARDRAILS,
} from '../src/constants/training';

interface Mesocycle {
  id: string;
  mesocycleNumber: number;
  startDate: string;
  endDate: string | null;
  lengthWeeks: number;
  currentWeek: number;
  splitType: string;
  daysPerWeek: number;
  setupMethod: string | null;
  templateId: string | null;
  customDays: { dayLabel: string; muscleGroups: string[] }[] | null;
  volumeTargets: Record<string, number>;
  customGuardrails: Record<string, { mev?: number; mrv?: number }> | null;
  startingRir: number;
  rirFloor: number;
  rirDecrementPerWeek: number;
  deloadRir: number;
}

export default function PlanSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meso, setMeso] = useState<Mesocycle | null>(null);

  // Editable state
  const [splitType, setSplitType] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [lengthWeeks, setLengthWeeks] = useState(5);
  const [customDays, setCustomDays] = useState<{ dayLabel: string; muscleGroups: string[] }[]>([]);
  const [volumeTargets, setVolumeTargets] = useState<Record<string, number>>({});
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [guardrails, setGuardrails] = useState<Record<string, { mev: number; mrv: number }>>(
    { ...DEFAULT_VOLUME_GUARDRAILS }
  );
  const [expandedGuardrail, setExpandedGuardrail] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [guardrailsDirty, setGuardrailsDirty] = useState(false);

  // RIR settings
  const [startingRir, setStartingRir] = useState(3);
  const [rirFloor, setRirFloor] = useState(1);
  const [rirDecrementPerWeek, setRirDecrementPerWeek] = useState(1);
  const [deloadRir, setDeloadRir] = useState(6);

  // Track original values for dirty check
  const [original, setOriginal] = useState<{
    splitType: string;
    daysPerWeek: number;
    lengthWeeks: number;
    customDays: string;
    volumeTargets: string;
    startingRir: number;
    rirFloor: number;
    rirDecrementPerWeek: number;
    deloadRir: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await apiGet('/training/mesocycle/active');
      if (!res.ok) {
        setMeso(null);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const m = data.mesocycle;
      setMeso(m);
      setSplitType(m.splitType);
      setDaysPerWeek(m.daysPerWeek);
      setLengthWeeks(m.lengthWeeks);
      setCustomDays(m.customDays || []);
      setVolumeTargets(m.volumeTargets || {});
      setStartingRir(m.startingRir ?? 3);
      setRirFloor(m.rirFloor ?? 1);
      setRirDecrementPerWeek(m.rirDecrementPerWeek ?? 1);
      setDeloadRir(m.deloadRir ?? 6);

      // Load effective guardrails
      try {
        const gRes = await apiGet('/training/volume-guardrails');
        if (gRes.ok) {
          const gData = await gRes.json();
          setGuardrails(gData.guardrails);
        }
      } catch {}

      setOriginal({
        splitType: m.splitType,
        daysPerWeek: m.daysPerWeek,
        lengthWeeks: m.lengthWeeks,
        customDays: JSON.stringify(m.customDays || []),
        volumeTargets: JSON.stringify(m.volumeTargets || {}),
        startingRir: m.startingRir ?? 3,
        rirFloor: m.rirFloor ?? 1,
        rirDecrementPerWeek: m.rirDecrementPerWeek ?? 1,
        deloadRir: m.deloadRir ?? 6,
      });
    } catch (err) {
      console.error('Load plan settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isDirty = guardrailsDirty || (original !== null && (
    splitType !== original.splitType ||
    daysPerWeek !== original.daysPerWeek ||
    lengthWeeks !== original.lengthWeeks ||
    JSON.stringify(customDays) !== original.customDays ||
    JSON.stringify(volumeTargets) !== original.volumeTargets ||
    startingRir !== original.startingRir ||
    rirFloor !== original.rirFloor ||
    rirDecrementPerWeek !== original.rirDecrementPerWeek ||
    deloadRir !== original.deloadRir
  ));

  const handleSave = async () => {
    if (!meso || !isDirty) return;
    setSaving(true);
    try {
      const body: any = {};
      if (splitType !== original!.splitType) body.splitType = splitType;
      if (daysPerWeek !== original!.daysPerWeek) body.daysPerWeek = daysPerWeek;
      if (lengthWeeks !== original!.lengthWeeks) body.lengthWeeks = lengthWeeks;
      if (JSON.stringify(customDays) !== original!.customDays && splitType === 'custom') {
        body.customDays = customDays;
      }
      if (JSON.stringify(volumeTargets) !== original!.volumeTargets) {
        body.volumeTargets = volumeTargets;
      }
      if (startingRir !== original!.startingRir) body.startingRir = startingRir;
      if (rirFloor !== original!.rirFloor) body.rirFloor = rirFloor;
      if (rirDecrementPerWeek !== original!.rirDecrementPerWeek) body.rirDecrementPerWeek = rirDecrementPerWeek;
      if (deloadRir !== original!.deloadRir) body.deloadRir = deloadRir;

      // Save custom guardrails if changed
      if (guardrailsDirty) {
        const customGuardrails: Record<string, { mev?: number; mrv?: number }> = {};
        for (const [muscle, guard] of Object.entries(guardrails)) {
          const def = DEFAULT_VOLUME_GUARDRAILS[muscle];
          if (def && (guard.mev !== def.mev || guard.mrv !== def.mrv)) {
            customGuardrails[muscle] = {};
            if (guard.mev !== def.mev) customGuardrails[muscle].mev = guard.mev;
            if (guard.mrv !== def.mrv) customGuardrails[muscle].mrv = guard.mrv;
          }
        }
        const gRes = await apiPut('/training/volume-guardrails', { customGuardrails });
        if (!gRes.ok) {
          const err = await gRes.json();
          Alert.alert('Error', err.error || 'Failed to save guardrails');
          return;
        }
        setGuardrailsDirty(false);
      }

      const res = await apiPut('/training/mesocycle/active', body);
      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to save changes');
        return;
      }

      // Update original to reflect saved state
      setOriginal({
        splitType,
        daysPerWeek,
        lengthWeeks,
        customDays: JSON.stringify(customDays),
        volumeTargets: JSON.stringify(volumeTargets),
        startingRir,
        rirFloor,
        rirDecrementPerWeek,
        deloadRir,
      });

      Alert.alert('Saved', 'Plan settings updated');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleEndMesocycle = () => {
    Alert.alert(
      'End Mesocycle?',
      'This will mark your current mesocycle as completed. You cannot undo this.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Mesocycle',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiPost('/training/mesocycle/active/end', {});
              if (!res.ok) {
                const err = await res.json();
                Alert.alert('Error', err.error || 'Failed to end mesocycle');
                return;
              }
              router.replace('/training-setup');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Network error');
            }
          },
        },
      ]
    );
  };

  const handleSplitChange = (newSplit: string) => {
    setSplitType(newSplit);
    if (newSplit === 'custom' && customDays.length !== daysPerWeek) {
      setCustomDays(
        Array.from({ length: daysPerWeek }, (_, i) => ({
          dayLabel: `Day ${i + 1}`,
          muscleGroups: [],
        }))
      );
    }
    setEditingDayIndex(null);
  };

  const handleDaysChange = (days: number) => {
    setDaysPerWeek(days);
    if (splitType === 'custom' && customDays.length !== days) {
      const newDays = Array.from({ length: days }, (_, i) =>
        customDays[i] || { dayLabel: `Day ${i + 1}`, muscleGroups: [] }
      );
      setCustomDays(newDays);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent_primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!meso) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl }}>
          <Text style={styles.emptyText}>No active mesocycle found.</Text>
          <TouchableOpacity style={{ marginTop: SPACING.lg }} onPress={() => router.back()}>
            <Text style={{ color: COLORS.accent_light, fontSize: 16, fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const startDateStr = new Date(meso.startDate).toLocaleDateString('en-US', {
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
            <Text style={styles.overviewTitle}>Mesocycle #{meso.mesocycleNumber}</Text>
            {meso.setupMethod && (
              <View style={styles.methodBadge}>
                <Text style={styles.methodBadgeText}>
                  {meso.setupMethod === 'template' ? 'Template' :
                   meso.setupMethod === 'plan' ? 'Planned' : 'Build As You Go'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.overviewSub}>
            Week {meso.currentWeek} of {lengthWeeks} · Started {startDateStr}
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

        {/* Custom day builder */}
        {splitType === 'custom' && (
          <View style={{ marginTop: SPACING.md }}>
            {customDays.map((day, dayIdx) => (
              <View key={dayIdx} style={[styles.customDayCard, editingDayIndex === dayIdx && styles.customDayCardActive]}>
                <TouchableOpacity
                  onPress={() => setEditingDayIndex(editingDayIndex === dayIdx ? null : dayIdx)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.customDayTitle, editingDayIndex === dayIdx && { color: COLORS.accent_light }]}>
                      {day.dayLabel}
                    </Text>
                    <Text style={styles.customDayMuscles}>
                      {day.muscleGroups.length > 0
                        ? day.muscleGroups.map((m) => MUSCLE_LABELS[m] || m).join(', ')
                        : 'Tap to set up'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {editingDayIndex === dayIdx && (
                  <View style={{ marginTop: SPACING.md }}>
                    <TextInput
                      style={styles.input}
                      placeholder="Day name (e.g., Chest & Triceps)"
                      placeholderTextColor={COLORS.text_tertiary}
                      value={day.dayLabel}
                      onChangeText={(text) => {
                        const updated = [...customDays];
                        updated[dayIdx] = { ...updated[dayIdx], dayLabel: text };
                        setCustomDays(updated);
                      }}
                    />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md }}>
                      {ALL_MUSCLE_GROUPS.map((muscle) => {
                        const isSelected = day.muscleGroups.includes(muscle);
                        return (
                          <TouchableOpacity
                            key={muscle}
                            style={[styles.muscleChip, isSelected && styles.muscleChipSelected]}
                            onPress={() => {
                              const updated = [...customDays];
                              const muscles = isSelected
                                ? day.muscleGroups.filter((m) => m !== muscle)
                                : [...day.muscleGroups, muscle];
                              updated[dayIdx] = { ...updated[dayIdx], muscleGroups: muscles };
                              setCustomDays(updated);
                            }}
                          >
                            <Text style={[styles.muscleChipText, isSelected && styles.muscleChipTextSelected]}>
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

        <Text style={[styles.fieldLabel, { marginTop: SPACING.lg }]}>Length (weeks)</Text>
        <View style={styles.buttonRow}>
          {[3, 4, 5, 6, 7, 8].map((w) => (
            <TouchableOpacity
              key={w}
              style={[
                styles.numButton,
                lengthWeeks === w && styles.numButtonSelected,
                w < meso.currentWeek && styles.numButtonDisabled,
              ]}
              onPress={() => w >= meso.currentWeek && setLengthWeeks(w)}
              disabled={w < meso.currentWeek}
            >
              <Text style={[
                styles.numButtonText,
                lengthWeeks === w && styles.numButtonTextSelected,
                w < meso.currentWeek && styles.numButtonTextDisabled,
              ]}>{w}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RIR Progression */}
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

        <Text style={[styles.fieldLabel, { marginTop: SPACING.lg }]}>Deload RIR</Text>
        <View style={styles.buttonRow}>
          {[4, 5, 6, 7].map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.numButton, deloadRir === v && styles.numButtonSelected]}
              onPress={() => setDeloadRir(v)}
            >
              <Text style={[styles.numButtonText, deloadRir === v && styles.numButtonTextSelected]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RIR Preview */}
        <View style={styles.rirPreview}>
          <Text style={styles.rirPreviewTitle}>Weekly progression</Text>
          <View style={styles.rirPreviewRow}>
            {Array.from({ length: lengthWeeks }, (_, i) => {
              const week = i + 1;
              const isDeload = week === lengthWeeks;
              const rawRir = startingRir - i * rirDecrementPerWeek;
              const weekRir = isDeload ? deloadRir : Math.max(rirFloor, Math.round(rawRir));
              return (
                <View key={week} style={styles.rirPreviewWeek}>
                  <Text style={styles.rirPreviewWeekLabel}>W{week}</Text>
                  <Text style={[
                    styles.rirPreviewValue,
                    isDeload && { color: COLORS.text_tertiary },
                    week === meso.currentWeek && { color: COLORS.accent_primary },
                  ]}>
                    {weekRir}
                  </Text>
                  {isDeload && <Text style={styles.rirPreviewDeload}>DL</Text>}
                </View>
              );
            })}
          </View>
        </View>

        {/* Volume Targets */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitleInline}>Volume Targets</Text>
          <TouchableOpacity onPress={() => setShowInfoModal(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={styles.infoButton}>
              <Text style={styles.infoButtonText}>i</Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.fieldLabel}>Sets per muscle group per week</Text>
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
                    onPress={() => setVolumeTargets({ ...volumeTargets, [muscle]: Math.max(0, value - 2) })}
                  >
                    <Text style={styles.volumeBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={[
                    styles.volumeValue,
                    value < guard.mev && value > 0 && { color: COLORS.warning },
                    value > guard.mrv && { color: COLORS.danger },
                  ]}>{value}</Text>
                  <TouchableOpacity
                    style={styles.volumeBtn}
                    onPress={() => setVolumeTargets({ ...volumeTargets, [muscle]: Math.min(guard.mrv + 2, value + 2) })}
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
                          setGuardrails({ ...guardrails, [muscle]: { ...guard, mev: newMev } });
                          setGuardrailsDirty(true);
                          if (value > 0 && value < newMev) setVolumeTargets({ ...volumeTargets, [muscle]: newMev });
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
                          setGuardrails({ ...guardrails, [muscle]: { ...guard, mev: newMev } });
                          setGuardrailsDirty(true);
                          if (value > 0 && value < newMev) setVolumeTargets({ ...volumeTargets, [muscle]: newMev });
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
                          setGuardrails({ ...guardrails, [muscle]: { ...guard, mrv: newMrv } });
                          setGuardrailsDirty(true);
                          if (value > newMrv) setVolumeTargets({ ...volumeTargets, [muscle]: newMrv });
                        }
                      }}
                    >
                      <Text style={styles.guardrailBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.guardrailValue}>{guard.mrv}</Text>
                    <TouchableOpacity
                      style={styles.guardrailBtn}
                      onPress={() => {
                        setGuardrails({ ...guardrails, [muscle]: { ...guard, mrv: guard.mrv + 1 } });
                        setGuardrailsDirty(true);
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

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleEndMesocycle}>
            <Text style={styles.dangerButtonText}>End Mesocycle Early</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sticky save button */}
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

  // Overview
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

  // Sections
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
  emptyText: {
    color: COLORS.text_secondary,
    fontSize: 16,
  },

  // Split options
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

  // Custom days
  customDayCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.sm,
  },
  customDayCardActive: {
    backgroundColor: COLORS.accent_subtle,
    borderColor: COLORS.accent_muted,
  },
  customDayTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text_primary,
  },
  customDayMuscles: {
    color: COLORS.text_tertiary,
    fontSize: 11,
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
  muscleChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  muscleChipSelected: {
    backgroundColor: COLORS.accent_primary,
    borderColor: COLORS.accent_primary,
  },
  muscleChipText: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  muscleChipTextSelected: {
    color: COLORS.text_on_accent,
  },

  // Number buttons
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

  // RIR preview
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
  rirPreviewDeload: {
    color: COLORS.text_tertiary,
    fontSize: 9,
    marginTop: 1,
  },

  // Section title with info button
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    marginTop: SPACING.xl,
  },
  sectionTitleInline: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text_primary,
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

  // Volume
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

  // Danger zone
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

  // Bottom bar
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
