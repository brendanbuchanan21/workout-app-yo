import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { apiGet, apiPost } from '../../src/utils/api';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import PRsTab from '../../src/components/Progress/PRsTab';
import StrengthTab from '../../src/components/Progress/StrengthTab';
import VolumeTab from '../../src/components/Progress/VolumeTab';
import ActivityTab from '../../src/components/Progress/ActivityTab';
import WeightTab from '../../src/components/Progress/WeightTab';

interface WeightEntry {
  date: string;
  weight: number;
}

interface PRRecord {
  weightKg: number;
  reps: number;
  date: string;
}

interface PREntry {
  exerciseName: string;
  catalogId: string | null;
  records: PRRecord[];
}

interface VolumeWeek {
  weekStart: string;
  muscles: Record<string, number>;
}

interface ActivityDay {
  count: number;
  labels: string[];
}

interface ExerciseHistoryPoint {
  date: string;
  bestWeightKg: number;
  bestReps: number;
  e1rmKg: number;
}

interface ExerciseHistory {
  exerciseName: string;
  catalogId: string | null;
  history: ExerciseHistoryPoint[];
}

type TabKey = 'prs' | 'strength' | 'volume' | 'activity' | 'weight';

export default function Progress() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('prs');

  const [prs, setPrs] = useState<PREntry[]>([]);
  const [expandedPR, setExpandedPR] = useState<string | null>(null);

  const [volumeWeeks, setVolumeWeeks] = useState<VolumeWeek[]>([]);
  const [currentVolume, setCurrentVolume] = useState<Record<string, number>>({});
  const [volumeTargets, setVolumeTargets] = useState<Record<string, number>>({});

  const [exerciseHistories, setExerciseHistories] = useState<ExerciseHistory[]>([]);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const [activity, setActivity] = useState<Record<string, ActivityDay>>({});

  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prsRes, weightRes, volumeHistRes, volumeSumRes, activityRes, exHistRes] = await Promise.all([
        apiGet('/training/prs'),
        apiGet('/weight'),
        apiGet('/training/volume-history'),
        apiGet('/training/volume-summary'),
        apiGet('/training/activity'),
        apiGet('/training/exercise-history'),
      ]);

      if (prsRes.ok) {
        const data = await prsRes.json();
        setPrs(data.prs);
      }

      if (weightRes.ok) {
        const data = await weightRes.json();
        setEntries(data.entries?.map((e: any) => ({
          date: e.date.split('T')[0],
          weight: Math.round(e.weightKg * 2.20462 * 10) / 10,
        })) || []);
      }

      if (volumeHistRes.ok) {
        const data = await volumeHistRes.json();
        setVolumeWeeks(data.weeks || []);
      }

      if (volumeSumRes.ok) {
        const data = await volumeSumRes.json();
        setCurrentVolume(data.volumeCompleted || {});
        setVolumeTargets(data.volumeTargets || {});
      }

      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.activity || {});
      }

      if (exHistRes.ok) {
        const data = await exHistRes.json();
        setExerciseHistories(data.exercises || []);
      }
    } catch (err) {
      console.error('Progress load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const togglePR = (pr: PREntry) => {
    const key = pr.catalogId || pr.exerciseName;
    setExpandedPR(expandedPR === key ? null : key);
  };

  const handleLogWeight = async () => {
    const w = parseFloat(newWeight);
    if (isNaN(w) || w <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }
    try {
      const weightKg = w / 2.20462;
      const today = new Date().toISOString().split('T')[0];
      const res = await apiPost('/weight', { date: today, weightKg });
      if (res.ok) {
        setNewWeight('');
        loadData();
      }
    } catch (err) {
      console.error('Log weight error:', err);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.screenTitle}>Progress</Text>

        <View style={styles.tabRow}>
          {([
            ['prs', 'PRs'],
            ['strength', 'Strength'],
            ['volume', 'Volume'],
            ['activity', 'Activity'],
            ['weight', 'Weight'],
          ] as [TabKey, string][]).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, tab === key && styles.tabActive]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'prs' && <PRsTab prs={prs} expandedPR={expandedPR} togglePR={togglePR} />}
        {tab === 'strength' && <StrengthTab exerciseHistories={exerciseHistories} expandedExercise={expandedExercise} setExpandedExercise={setExpandedExercise} />}
        {tab === 'volume' && <VolumeTab currentVolume={currentVolume} volumeTargets={volumeTargets} volumeWeeks={volumeWeeks} />}
        {tab === 'activity' && <ActivityTab activity={activity} />}
        {tab === 'weight' && <WeightTab entries={entries} newWeight={newWeight} setNewWeight={setNewWeight} handleLogWeight={handleLogWeight} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg_primary,
  },
  scroll: {
    padding: SPACING.xl,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text_primary,
    marginBottom: SPACING.lg,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.bg_input,
  },
  tabText: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.text_primary,
  },
});
