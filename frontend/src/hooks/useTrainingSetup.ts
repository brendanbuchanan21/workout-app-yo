import { useState } from 'react';
import { Alert } from 'react-native';

import { apiPost, apiGet } from '../utils/api';
import { SPLIT_SUGGESTIONS, VOLUME_DEFAULTS, DEFAULT_VOLUME_GUARDRAILS } from '../constants/training';

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

interface UseTrainingSetupParams {
  user: any;
  refreshUser: () => Promise<void>;
  router: { replace: (path: string) => void };
}

export function useTrainingSetup({ user, refreshUser, router }: UseTrainingSetupParams) {
  const [screen, setScreen] = useState<SetupPath>('choose');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [dayOrder, setDayOrder] = useState<number[]>([]);

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
      const createRes = await apiPost('/training/block/create', {
        splitType: template.splitType,
        daysPerWeek: template.daysPerWeek,
        setupMethod: 'template',
        lengthWeeks: template.lengthWeeks,
      });
      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || 'Failed to create training block');
      }

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

  const createTrainingBlock = async (setupMethod: 'plan' | 'build_as_you_go') => {
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

      const res = await apiPost('/training/block/create', body);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create training block');
      }

      await refreshUser();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSplitSelect = (s: string) => {
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
  };

  const validateCustomDays = (): boolean => {
    if (splitType === 'custom') {
      for (const day of customDays) {
        if (!day.dayLabel.trim() || day.muscleGroups.length === 0) {
          Alert.alert('Hold on', 'Each day needs a name and at least one muscle group');
          return false;
        }
      }
    }
    return true;
  };

  return {
    screen,
    setScreen,
    isSubmitting,
    templates,
    loadingTemplates,
    selectedTemplate,
    setSelectedTemplate,
    dayOrder,
    setDayOrder,
    daysPerWeek,
    splitType,
    customDays,
    editingDayIndex,
    setEditingDayIndex,
    setCustomDays,
    volumeTargets,
    setVolumeTargets,
    guardrails,
    setGuardrails,
    expandedGuardrail,
    setExpandedGuardrail,
    showInfoModal,
    setShowInfoModal,
    handleDaysChange,
    loadTemplates,
    applyTemplate,
    createTrainingBlock,
    handleSplitSelect,
    validateCustomDays,
  };
}
