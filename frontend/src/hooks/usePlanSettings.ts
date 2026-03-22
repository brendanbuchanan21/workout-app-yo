import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { apiGet, apiPut, apiPost } from '../utils/api';
import { DEFAULT_VOLUME_GUARDRAILS } from '../constants/training';

interface TrainingBlock {
  id: string;
  blockNumber: number;
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

export default function usePlanSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [block, setBlock] = useState<TrainingBlock | null>(null);

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
      const res = await apiGet('/training/block/active');
      if (!res.ok) {
        setBlock(null);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const b = data.trainingBlock;
      setBlock(b);
      setSplitType(b.splitType);
      setDaysPerWeek(b.daysPerWeek);
      setLengthWeeks(b.lengthWeeks);
      setCustomDays(b.customDays || []);
      setVolumeTargets(b.volumeTargets || {});
      setStartingRir(b.startingRir ?? 3);
      setRirFloor(b.rirFloor ?? 1);
      setRirDecrementPerWeek(b.rirDecrementPerWeek ?? 1);
      setDeloadRir(b.deloadRir ?? 6);

      try {
        const gRes = await apiGet('/training/volume-guardrails');
        if (gRes.ok) {
          const gData = await gRes.json();
          setGuardrails(gData.guardrails);
        }
      } catch {}

      setOriginal({
        splitType: b.splitType,
        daysPerWeek: b.daysPerWeek,
        lengthWeeks: b.lengthWeeks,
        customDays: JSON.stringify(b.customDays || []),
        volumeTargets: JSON.stringify(b.volumeTargets || {}),
        startingRir: b.startingRir ?? 3,
        rirFloor: b.rirFloor ?? 1,
        rirDecrementPerWeek: b.rirDecrementPerWeek ?? 1,
        deloadRir: b.deloadRir ?? 6,
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
    if (!block || !isDirty) return;
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

      const res = await apiPut('/training/block/active', body);
      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to save changes');
        return;
      }

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

  const handleEndBlock = () => {
    Alert.alert(
      'End Block?',
      'This will mark your current training block as completed. You cannot undo this.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiPost('/training/block/active/end', {});
              if (!res.ok) {
                const err = await res.json();
                Alert.alert('Error', err.error || 'Failed to end training block');
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

  return {
    loading,
    saving,
    block,
    splitType,
    daysPerWeek,
    lengthWeeks,
    customDays,
    setCustomDays,
    volumeTargets,
    setVolumeTargets,
    editingDayIndex,
    setEditingDayIndex,
    guardrails,
    setGuardrails,
    expandedGuardrail,
    setExpandedGuardrail,
    showInfoModal,
    setShowInfoModal,
    guardrailsDirty,
    setGuardrailsDirty,
    startingRir,
    setStartingRir,
    rirFloor,
    setRirFloor,
    rirDecrementPerWeek,
    setRirDecrementPerWeek,
    deloadRir,
    setDeloadRir,
    setLengthWeeks,
    isDirty,
    handleSave,
    handleEndBlock,
    handleSplitChange,
    handleDaysChange,
  };
}
