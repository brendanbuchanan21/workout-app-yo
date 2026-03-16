import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Rect, Polyline, Line, Text as SvgText } from 'react-native-svg';

import { apiGet, apiPost } from '../../src/utils/api';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

// ==========================================
// Types
// ==========================================

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

// ==========================================
// Helpers
// ==========================================

function formatWeight(kg: number): string {
  return `${Math.round(kg * 2.20462)} lbs`;
}

const screenWidth = Dimensions.get('window').width;

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#E8912D',
  back: '#4ADE80',
  quads: '#60A5FA',
  hamstrings: '#A78BFA',
  side_delts: '#F472B6',
  rear_delts: '#FB923C',
  biceps: '#34D399',
  triceps: '#FBBF24',
  glutes: '#C084FC',
  calves: '#F87171',
  traps: '#38BDF8',
  abs: '#FB7185',
};

function getMuscleColor(muscle: string): string {
  return MUSCLE_COLORS[muscle] || COLORS.accent_primary;
}

function formatMuscle(muscle: string): string {
  return muscle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ==========================================
// Component
// ==========================================

export default function Progress() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('prs');

  // PR state
  const [prs, setPrs] = useState<PREntry[]>([]);
  const [expandedPR, setExpandedPR] = useState<string | null>(null);

  // Volume state
  const [volumeWeeks, setVolumeWeeks] = useState<VolumeWeek[]>([]);
  const [currentVolume, setCurrentVolume] = useState<Record<string, number>>({});
  const [volumeTargets, setVolumeTargets] = useState<Record<string, number>>({});

  // Strength / e1RM state
  const [exerciseHistories, setExerciseHistories] = useState<ExerciseHistory[]>([]);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  // Activity state
  const [activity, setActivity] = useState<Record<string, ActivityDay>>({});

  // Body weight state
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

        {/* Tab Switcher */}
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

        {tab === 'prs' && renderPRs()}
        {tab === 'strength' && renderStrength()}
        {tab === 'volume' && renderVolume()}
        {tab === 'activity' && renderActivity()}
        {tab === 'weight' && renderWeight()}
      </ScrollView>
    </SafeAreaView>
  );

  // ==========================================
  // PRs Tab
  // ==========================================
  function renderPRs() {
    if (prs.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No PRs Yet</Text>
          <Text style={styles.emptyText}>Complete workouts to start tracking your personal records.</Text>
        </View>
      );
    }

    return (
      <>
        <Text style={styles.prCount}>{prs.length} exercise{prs.length !== 1 ? 's' : ''} tracked</Text>
        {prs.map((pr) => {
          const key = pr.catalogId || pr.exerciseName;
          const isExpanded = expandedPR === key;
          const topRecord = pr.records[0];

          return (
            <TouchableOpacity
              key={key}
              style={styles.prCard}
              onPress={() => togglePR(pr)}
              activeOpacity={0.7}
            >
              <View style={styles.prCardHeader}>
                <View style={styles.prCardInfo}>
                  <Text style={styles.prCardName}>{pr.exerciseName}</Text>
                  <Text style={styles.prCardMeta}>
                    {pr.records.length} weight{pr.records.length !== 1 ? 's' : ''} tracked
                  </Text>
                </View>
                {topRecord && (
                  <View style={styles.prCardBest}>
                    <Text style={styles.prCardWeight}>{formatWeight(topRecord.weightKg)}</Text>
                    <Text style={styles.prCardReps}>x {topRecord.reps}</Text>
                  </View>
                )}
              </View>

              {isExpanded && (
                <View style={styles.prCardExpanded}>
                  {pr.records.map((rec, i) => (
                    <View key={i} style={styles.prRecordRow}>
                      <Text style={styles.prRecordWeight}>{formatWeight(rec.weightKg)}</Text>
                      <Text style={styles.prRecordReps}>{rec.reps} reps</Text>
                      <Text style={styles.prRecordDate}>
                        {new Date(rec.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </>
    );
  }

  // ==========================================
  // Strength Tab (e1RM + per-exercise progression)
  // ==========================================
  function renderStrength() {
    if (exerciseHistories.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Strength Data</Text>
          <Text style={styles.emptyText}>Complete workouts to see your estimated 1RM and exercise progression.</Text>
        </View>
      );
    }

    // Top e1RM per exercise (latest value)
    const topE1rms = exerciseHistories
      .map((ex) => {
        const latest = ex.history[ex.history.length - 1];
        const peak = ex.history.reduce((max, h) => h.e1rmKg > max.e1rmKg ? h : max, ex.history[0]);
        return {
          ...ex,
          latestE1rm: latest.e1rmKg,
          peakE1rm: peak.e1rmKg,
          trending: ex.history.length >= 2
            ? latest.e1rmKg - ex.history[ex.history.length - 2].e1rmKg
            : 0,
        };
      })
      .sort((a, b) => b.peakE1rm - a.peakE1rm);

    return (
      <>
        <Text style={styles.chartSubtitle}>Estimated 1RM per exercise (Epley formula)</Text>

        {topE1rms.map((ex) => {
          const key = ex.catalogId || ex.exerciseName;
          const isExpanded = expandedExercise === key;

          return (
            <TouchableOpacity
              key={key}
              style={styles.prCard}
              onPress={() => setExpandedExercise(isExpanded ? null : key)}
              activeOpacity={0.7}
            >
              <View style={styles.prCardHeader}>
                <View style={styles.prCardInfo}>
                  <Text style={styles.prCardName}>{ex.exerciseName}</Text>
                  <Text style={styles.prCardMeta}>
                    {ex.history.length} session{ex.history.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.prCardBest}>
                  <Text style={styles.prCardWeight}>{formatWeight(ex.latestE1rm)}</Text>
                  {ex.trending !== 0 && (
                    <Text style={[
                      styles.e1rmTrend,
                      { color: ex.trending > 0 ? COLORS.success : COLORS.danger },
                    ]}>
                      {ex.trending > 0 ? '+' : ''}{formatWeight(Math.abs(ex.trending))}
                    </Text>
                  )}
                </View>
              </View>

              {isExpanded && (
                <View style={styles.prCardExpanded}>
                  {/* e1RM chart */}
                  {ex.history.length > 1 && renderE1rmChart(ex)}

                  {/* Session history */}
                  <Text style={[styles.strengthHistoryLabel, { marginTop: SPACING.md }]}>Session History</Text>
                  {[...ex.history].reverse().slice(0, 10).map((h, i) => (
                    <View key={i} style={styles.prRecordRow}>
                      <Text style={styles.prRecordDate}>
                        {new Date(h.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={styles.prRecordWeight}>
                        {formatWeight(h.bestWeightKg)} x {h.bestReps}
                      </Text>
                      <Text style={styles.prRecordReps}>
                        e1RM: {formatWeight(h.e1rmKg)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </>
    );
  }

  function renderE1rmChart(ex: ExerciseHistory) {
    const chartWidth = screenWidth - SPACING.xl * 2 - SPACING.lg * 2;
    const chartHeight = 140;
    const padding = { top: 10, right: 10, bottom: 20, left: 45 };
    const innerW = chartWidth - padding.left - padding.right;
    const innerH = chartHeight - padding.top - padding.bottom;

    const e1rms = ex.history.map((h) => h.e1rmKg);
    const minE = Math.min(...e1rms) * 0.95;
    const maxE = Math.max(...e1rms) * 1.05;
    const range = maxE - minE || 1;

    const points = ex.history
      .map((h, i) => {
        const x = padding.left + (i / Math.max(ex.history.length - 1, 1)) * innerW;
        const y = padding.top + (1 - (h.e1rmKg - minE) / range) * innerH;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <View style={{ alignItems: 'center', marginTop: SPACING.sm }}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          {[0, 0.5, 1].map((frac, i) => {
            const y = padding.top + (1 - frac) * innerH;
            const val = minE + frac * range;
            return (
              <Line
                key={i}
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke={COLORS.border_subtle}
                strokeWidth={1}
              />
            );
          })}
          {/* Y-axis labels */}
          {[0, 0.5, 1].map((frac, i) => {
            const y = padding.top + (1 - frac) * innerH;
            const val = minE + frac * range;
            return (
              <SvgText
                key={i}
                x={padding.left - 4}
                y={y + 4}
                fontSize={9}
                fill={COLORS.text_tertiary}
                textAnchor="end"
              >
                {Math.round(val * 2.20462)}
              </SvgText>
            );
          })}
          {/* X-axis labels */}
          {ex.history.length > 0 && (
            <>
              <SvgText
                x={padding.left}
                y={chartHeight - 2}
                fontSize={8}
                fill={COLORS.text_tertiary}
                textAnchor="start"
              >
                {ex.history[0].date.slice(5)}
              </SvgText>
              <SvgText
                x={chartWidth - padding.right}
                y={chartHeight - 2}
                fontSize={8}
                fill={COLORS.text_tertiary}
                textAnchor="end"
              >
                {ex.history[ex.history.length - 1].date.slice(5)}
              </SvgText>
            </>
          )}
          {/* Line */}
          <Polyline
            points={points}
            fill="none"
            stroke={COLORS.accent_primary}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    );
  }

  // ==========================================
  // Volume Tab
  // ==========================================
  function renderVolume() {
    // Current week volume bars
    const allMuscles = Array.from(new Set([
      ...Object.keys(currentVolume),
      ...Object.keys(volumeTargets),
    ])).sort();

    // All-time chart
    const allTimeMuscles = new Set<string>();
    for (const week of volumeWeeks) {
      for (const muscle of Object.keys(week.muscles)) {
        allTimeMuscles.add(muscle);
      }
    }
    const chartMuscles = Array.from(allTimeMuscles).sort();

    return (
      <>
        {/* Current Week Volume */}
        <Text style={styles.sectionTitle}>This Week</Text>
        {allMuscles.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Volume Data</Text>
            <Text style={styles.emptyText}>Complete workouts to see your weekly volume.</Text>
          </View>
        ) : (
          <View style={styles.volumeCard}>
            {allMuscles.map((muscle) => {
              const completed = currentVolume[muscle] || 0;
              const target = volumeTargets[muscle] || 0;
              const maxVal = Math.max(completed, target, 1);
              const pct = Math.min(completed / maxVal, 1);

              return (
                <View key={muscle} style={styles.volumeRow}>
                  <Text style={styles.volumeLabel}>{formatMuscle(muscle)}</Text>
                  <View style={styles.volumeBarContainer}>
                    <View
                      style={[
                        styles.volumeBar,
                        {
                          width: `${pct * 100}%`,
                          backgroundColor: getMuscleColor(muscle),
                        },
                      ]}
                    />
                    {target > 0 && (
                      <View
                        style={[
                          styles.volumeTargetLine,
                          { left: `${Math.min((target / maxVal) * 100, 100)}%` },
                        ]}
                      />
                    )}
                  </View>
                  <Text style={styles.volumeCount}>
                    {completed}{target > 0 ? `/${target}` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* All-Time Total Volume */}
        {volumeWeeks.length > 0 && chartMuscles.length > 0 && (() => {
          const allTimeTotals: Record<string, number> = {};
          for (const week of volumeWeeks) {
            for (const [muscle, sets] of Object.entries(week.muscles)) {
              allTimeTotals[muscle] = (allTimeTotals[muscle] || 0) + sets;
            }
          }
          const sortedMuscles = Object.entries(allTimeTotals).sort((a, b) => b[1] - a[1]);
          const maxSets = sortedMuscles.length > 0 ? sortedMuscles[0][1] : 1;

          return (
            <>
              <Text style={[styles.sectionTitle, { marginTop: SPACING.xxl }]}>All-Time Volume</Text>
              <Text style={styles.chartSubtitle}>Total sets per muscle group</Text>
              <View style={styles.volumeCard}>
                {sortedMuscles.map(([muscle, total]) => (
                  <View key={muscle} style={styles.volumeRow}>
                    <Text style={styles.volumeLabel}>{formatMuscle(muscle)}</Text>
                    <View style={styles.volumeBarContainer}>
                      <View
                        style={[
                          styles.volumeBar,
                          {
                            width: `${(total / maxSets) * 100}%`,
                            backgroundColor: getMuscleColor(muscle),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.volumeCount}>{total}</Text>
                  </View>
                ))}
              </View>
            </>
          );
        })()}

        {/* Volume Over Time Chart */}
        {volumeWeeks.length > 1 && chartMuscles.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: SPACING.xxl }]}>Volume Over Time</Text>
            <Text style={styles.chartSubtitle}>Weekly sets per muscle group</Text>
            {renderVolumeChart(chartMuscles)}

            {/* Legend */}
            <View style={styles.legendContainer}>
              {chartMuscles.map((muscle) => (
                <View key={muscle} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: getMuscleColor(muscle) }]} />
                  <Text style={styles.legendText}>{formatMuscle(muscle)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </>
    );
  }

  function renderVolumeChart(muscles: string[]) {
    const chartWidth = screenWidth - SPACING.xl * 2 - SPACING.lg * 2;
    const chartHeight = 180;
    const padding = { top: 10, right: 10, bottom: 25, left: 35 };
    const innerW = chartWidth - padding.left - padding.right;
    const innerH = chartHeight - padding.top - padding.bottom;

    // Find max total volume in any week for y-axis
    let maxTotal = 0;
    for (const week of volumeWeeks) {
      const total = Object.values(week.muscles).reduce((a, b) => a + b, 0);
      if (total > maxTotal) maxTotal = total;
    }
    if (maxTotal === 0) maxTotal = 1;

    // Draw stacked area per muscle (simplified: line chart of total volume)
    const totalPoints = volumeWeeks
      .map((week, i) => {
        const total = Object.values(week.muscles).reduce((a, b) => a + b, 0);
        const x = padding.left + (i / Math.max(volumeWeeks.length - 1, 1)) * innerW;
        const y = padding.top + (1 - total / maxTotal) * innerH;
        return `${x},${y}`;
      })
      .join(' ');

    // Per-muscle lines
    const muscleLines = muscles.map((muscle) => {
      let maxMuscle = 0;
      for (const week of volumeWeeks) {
        if ((week.muscles[muscle] || 0) > maxMuscle) maxMuscle = week.muscles[muscle] || 0;
      }
      if (maxMuscle === 0) return null;

      const points = volumeWeeks
        .map((week, i) => {
          const val = week.muscles[muscle] || 0;
          const x = padding.left + (i / Math.max(volumeWeeks.length - 1, 1)) * innerW;
          const y = padding.top + (1 - val / maxTotal) * innerH;
          return `${x},${y}`;
        })
        .join(' ');

      return { muscle, points };
    }).filter(Boolean) as { muscle: string; points: string }[];

    return (
      <View style={styles.chartCard}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
            const y = padding.top + (1 - frac) * innerH;
            return (
              <Line
                key={i}
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke={COLORS.border_subtle}
                strokeWidth={1}
              />
            );
          })}
          {/* Y-axis labels */}
          {[0, 0.5, 1].map((frac, i) => {
            const y = padding.top + (1 - frac) * innerH;
            return (
              <SvgText
                key={i}
                x={padding.left - 4}
                y={y + 4}
                fontSize={9}
                fill={COLORS.text_tertiary}
                textAnchor="end"
              >
                {Math.round(maxTotal * frac)}
              </SvgText>
            );
          })}
          {/* X-axis labels (first and last week) */}
          {volumeWeeks.length > 0 && (
            <>
              <SvgText
                x={padding.left}
                y={chartHeight - 4}
                fontSize={8}
                fill={COLORS.text_tertiary}
                textAnchor="start"
              >
                {volumeWeeks[0].weekStart.slice(5)}
              </SvgText>
              <SvgText
                x={chartWidth - padding.right}
                y={chartHeight - 4}
                fontSize={8}
                fill={COLORS.text_tertiary}
                textAnchor="end"
              >
                {volumeWeeks[volumeWeeks.length - 1].weekStart.slice(5)}
              </SvgText>
            </>
          )}
          {/* Per-muscle lines */}
          {muscleLines.map(({ muscle, points }) => (
            <Polyline
              key={muscle}
              points={points}
              fill="none"
              stroke={getMuscleColor(muscle)}
              strokeWidth={1.5}
              strokeLinejoin="round"
              opacity={0.7}
            />
          ))}
          {/* Total volume line */}
          <Polyline
            points={totalPoints}
            fill="none"
            stroke={COLORS.text_primary}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    );
  }

  // ==========================================
  // Activity Tab (GitHub-style heat map)
  // ==========================================
  function renderActivity() {
    const today = new Date();
    const totalWeeks = 52;
    const cellSize = Math.floor((screenWidth - SPACING.xl * 2 - 30) / totalWeeks) - 1;
    const cellGap = 1;

    // Build grid: 52 columns (weeks) x 7 rows (days, Mon=0 to Sun=6)
    // Start from 52 weeks ago, aligned to Monday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (totalWeeks * 7));
    // Align to Monday
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + mondayOffset);

    const cells: { date: string; count: number; col: number; row: number }[] = [];
    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(startDate);
    for (let col = 0; col < totalWeeks; col++) {
      for (let row = 0; row < 7; row++) {
        const dateKey = cursor.toISOString().split('T')[0];
        const dayActivity = activity[dateKey];
        const count = dayActivity?.count || 0;

        if (cursor <= today) {
          cells.push({ date: dateKey, count, col, row });
        }

        // Month labels on first row
        if (row === 0 && cursor.getMonth() !== lastMonth) {
          lastMonth = cursor.getMonth();
          monthLabels.push({
            label: cursor.toLocaleDateString('en-US', { month: 'short' }),
            col,
          });
        }

        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const totalWorkouts = Object.values(activity).reduce((sum, d) => sum + d.count, 0);
    const activeDays = Object.keys(activity).length;

    // Current streak
    let streak = 0;
    const streakCursor = new Date(today);
    // Check if today has a workout, if not start from yesterday
    const todayKey = streakCursor.toISOString().split('T')[0];
    if (!activity[todayKey]) {
      streakCursor.setDate(streakCursor.getDate() - 1);
    }
    while (true) {
      const key = streakCursor.toISOString().split('T')[0];
      if (activity[key]) {
        streak++;
        streakCursor.setDate(streakCursor.getDate() - 1);
      } else {
        break;
      }
    }

    const svgWidth = totalWeeks * (cellSize + cellGap);
    const svgHeight = 7 * (cellSize + cellGap) + 15; // extra for month labels

    function getCellColor(count: number): string {
      if (count === 0) return COLORS.bg_elevated;
      if (count === 1) return 'rgba(232, 145, 45, 0.3)';
      if (count === 2) return 'rgba(232, 145, 45, 0.55)';
      return COLORS.accent_primary;
    }

    return (
      <>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Workouts</Text>
            <Text style={styles.statValue}>{totalWorkouts}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Days</Text>
            <Text style={styles.statValue}>{activeDays}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={styles.statValue}>{streak}d</Text>
          </View>
        </View>

        {/* Heat Map */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Workout Activity</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Month labels */}
              <View style={{ height: 14, marginLeft: 0 }}>
                <Svg width={svgWidth} height={14}>
                  {monthLabels.map((m, i) => (
                    <SvgText
                      key={i}
                      x={m.col * (cellSize + cellGap)}
                      y={10}
                      fontSize={8}
                      fill={COLORS.text_tertiary}
                    >
                      {m.label}
                    </SvgText>
                  ))}
                </Svg>
              </View>
              {/* Grid */}
              <Svg width={svgWidth} height={7 * (cellSize + cellGap)}>
                {cells.map((cell, i) => (
                  <Rect
                    key={i}
                    x={cell.col * (cellSize + cellGap)}
                    y={cell.row * (cellSize + cellGap)}
                    width={cellSize}
                    height={cellSize}
                    rx={2}
                    fill={getCellColor(cell.count)}
                  />
                ))}
              </Svg>
            </View>
          </ScrollView>

          {/* Legend */}
          <View style={styles.heatLegend}>
            <Text style={styles.heatLegendText}>Less</Text>
            {[0, 1, 2, 3].map((count) => (
              <View
                key={count}
                style={[styles.heatLegendCell, { backgroundColor: getCellColor(count) }]}
              />
            ))}
            <Text style={styles.heatLegendText}>More</Text>
          </View>
        </View>

        {/* Day labels */}
        <View style={styles.dayLabels}>
          {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((label, i) => (
            <Text key={i} style={styles.dayLabel}>{label}</Text>
          ))}
        </View>
      </>
    );
  }

  // ==========================================
  // Body Weight Tab
  // ==========================================
  function renderWeight() {
    const chartWidth = screenWidth - SPACING.xl * 2 - SPACING.lg * 2;
    const chartHeight = 150;
    const chartPadding = { top: 10, right: 10, bottom: 20, left: 40 };
    const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
    const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;

    const weights = entries.map((e) => e.weight);
    const minW = weights.length > 0 ? Math.min(...weights) - 1 : 0;
    const maxW = weights.length > 0 ? Math.max(...weights) + 1 : 1;

    const weightPoints = entries.length > 1
      ? entries
          .map((e, i) => {
            const x = chartPadding.left + (i / (entries.length - 1)) * innerWidth;
            const y = chartPadding.top + (1 - (e.weight - minW) / (maxW - minW)) * innerHeight;
            return `${x},${y}`;
          })
          .join(' ')
      : '';

    const latestWeight = entries.length > 0 ? entries[entries.length - 1].weight : null;
    const weekAgoWeight = entries.length >= 7 ? entries[entries.length - 7].weight : null;
    const weeklyChange = latestWeight && weekAgoWeight ? latestWeight - weekAgoWeight : null;

    return (
      <>
        {/* Current stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Current</Text>
            <Text style={styles.statValue}>{latestWeight ? `${latestWeight} lbs` : '--'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>7-Day Change</Text>
            <Text style={[styles.statValue, weeklyChange !== null && weeklyChange < 0 ? { color: COLORS.success } : {}]}>
              {weeklyChange !== null ? `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} lbs` : '--'}
            </Text>
          </View>
        </View>

        {/* Weight chart */}
        {entries.length > 1 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Body Weight (last {entries.length} days)</Text>
            <Svg width={chartWidth} height={chartHeight}>
              {[minW, (minW + maxW) / 2, maxW].map((w, i) => {
                const y = chartPadding.top + (1 - (w - minW) / (maxW - minW)) * innerHeight;
                return (
                  <Line
                    key={i}
                    x1={chartPadding.left}
                    y1={y}
                    x2={chartWidth - chartPadding.right}
                    y2={y}
                    stroke={COLORS.border_subtle}
                    strokeWidth={1}
                  />
                );
              })}
              {[minW, maxW].map((w, i) => {
                const y = chartPadding.top + (1 - (w - minW) / (maxW - minW)) * innerHeight;
                return (
                  <SvgText
                    key={i}
                    x={chartPadding.left - 4}
                    y={y + 4}
                    fontSize={9}
                    fill={COLORS.text_tertiary}
                    textAnchor="end"
                  >
                    {w.toFixed(0)}
                  </SvgText>
                );
              })}
              <Polyline
                points={weightPoints}
                fill="none"
                stroke={COLORS.accent_primary}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        )}

        {/* Log weight */}
        <View style={styles.logSection}>
          <Text style={styles.logTitle}>Log Today's Weight</Text>
          <View style={styles.logRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Weight (lbs)"
              placeholderTextColor={COLORS.text_tertiary}
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.logButton} onPress={handleLogWeight}>
              <Text style={styles.logButtonText}>Log</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent entries */}
        {entries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Entries</Text>
            {[...entries].reverse().slice(0, 7).map((entry) => (
              <View key={entry.date} style={styles.entryRow}>
                <Text style={styles.entryDate}>
                  {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <Text style={styles.entryWeight}>{entry.weight} lbs</Text>
              </View>
            ))}
          </>
        )}

        {entries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Weight Entries</Text>
            <Text style={styles.emptyText}>Log your body weight to start tracking trends.</Text>
          </View>
        )}
      </>
    );
  }
}

// ==========================================
// Styles
// ==========================================

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

  // Tabs
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

  // Section
  sectionTitle: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  chartSubtitle: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    marginBottom: SPACING.md,
    marginTop: -SPACING.sm,
  },

  // PRs
  prCount: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    marginBottom: SPACING.md,
  },
  prCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  prCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prCardInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  prCardName: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '600',
  },
  prCardMeta: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    marginTop: 2,
  },
  prCardBest: {
    alignItems: 'flex-end',
  },
  prCardWeight: {
    color: COLORS.accent_primary,
    fontSize: 18,
    fontWeight: '700',
  },
  prCardReps: {
    color: COLORS.text_secondary,
    fontSize: 13,
    marginTop: 1,
  },
  prCardExpanded: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  prRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border_subtle,
  },
  prRecordWeight: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    width: 90,
  },
  prRecordReps: {
    color: COLORS.accent_primary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  prRecordDate: {
    color: COLORS.text_tertiary,
    fontSize: 12,
  },

  // Strength
  e1rmTrend: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  strengthHistoryLabel: {
    color: COLORS.text_tertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Volume
  volumeCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  volumeLabel: {
    color: COLORS.text_secondary,
    fontSize: 12,
    width: 80,
  },
  volumeBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.sm,
    marginHorizontal: SPACING.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  volumeBar: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  volumeTargetLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.text_primary,
    opacity: 0.5,
  },
  volumeCount: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    width: 40,
    textAlign: 'right',
  },

  // Legend
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: COLORS.text_tertiary,
    fontSize: 10,
  },

  // Heat map
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: SPACING.md,
  },
  heatLegendText: {
    color: COLORS.text_tertiary,
    fontSize: 9,
  },
  heatLegendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  dayLabels: {
    position: 'absolute',
    left: SPACING.xl,
    top: 0,
    display: 'none', // hidden, just for reference
  },
  dayLabel: {
    color: COLORS.text_tertiary,
    fontSize: 8,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyTitle: {
    color: COLORS.text_primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    textAlign: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  statLabel: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    color: COLORS.text_primary,
    fontSize: 20,
    fontWeight: '700',
  },

  // Charts
  chartCard: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  chartTitle: {
    color: COLORS.text_secondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },

  // Body weight
  logSection: {
    marginBottom: SPACING.xl,
  },
  logTitle: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  logRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text_primary,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  logButton: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xxl,
    justifyContent: 'center',
  },
  logButtonText: {
    color: COLORS.text_on_accent,
    fontSize: 15,
    fontWeight: '700',
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border_subtle,
  },
  entryDate: {
    color: COLORS.text_secondary,
    fontSize: 13,
  },
  entryWeight: {
    color: COLORS.text_primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
