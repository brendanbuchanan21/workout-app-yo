import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { MUSCLE_LABELS } from '../../constants/training';
import { DayOption, TodayContext } from '../../types/training';

interface DayPickerProps {
  today: TodayContext;
  onStartDay: (option: DayOption) => void;
  SettingsLink: React.ComponentType;
}

export default function DayPicker({ today, onStartDay, SettingsLink }: DayPickerProps) {
  const dayOptions = today.dayOptions!;
  const completedDays = dayOptions.filter((d) => d.completed);
  const nextDay = dayOptions.find((d) => !d.completed);
  const totalDays = dayOptions.length;
  const completedCount = completedDays.length;
  const allDone = completedCount === totalDays;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.blockLabel}>Week {today.weekNumber} · RIR {today.targetRir}</Text>
        <SettingsLink />

        {nextDay && !allDone && (
          <View style={styles.nextUpCard}>
            <Text style={styles.nextUpLabel}>Next Up</Text>
            <Text style={styles.nextUpTitle}>{nextDay.dayLabel}</Text>
            <Text style={styles.nextUpMuscles}>
              {nextDay.muscleGroups.map((m) => MUSCLE_LABELS[m] || m).join(', ')}
            </Text>
            <TouchableOpacity style={styles.startWorkoutBtn} onPress={() => onStartDay(nextDay)}>
              <Text style={styles.startWorkoutBtnText}>Start Workout</Text>
            </TouchableOpacity>
          </View>
        )}

        {allDone && (
          <View style={styles.nextUpCard}>
            <Text style={styles.nextUpTitle}>Week Complete</Text>
            <Text style={styles.nextUpMuscles}>All {totalDays} sessions finished this week</Text>
          </View>
        )}

        <View style={styles.weekProgressSection}>
          <Text style={styles.weekProgressTitle}>
            This Week ({completedCount} of {totalDays})
          </Text>
          <View style={styles.weekDayPills}>
            {dayOptions.map((option, i) => {
              const isNext = !option.completed && option === nextDay;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.weekDayPill,
                    option.completed && styles.weekDayPillDone,
                    isNext && styles.weekDayPillNext,
                  ]}
                  onPress={() => {
                    if (!option.completed) onStartDay(option);
                  }}
                  activeOpacity={option.completed ? 1 : 0.7}
                >
                  <Text style={[
                    styles.weekDayPillText,
                    option.completed && styles.weekDayPillTextDone,
                    isNext && styles.weekDayPillTextNext,
                  ]}>
                    {option.dayLabel}
                  </Text>
                  {option.completed && <Text style={styles.weekDayPillCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {completedDays.length > 0 && (
          <View style={styles.completedSection}>
            <Text style={styles.completedSectionTitle}>Completed</Text>
            {completedDays.map((day, i) => (
              <View key={i} style={styles.completedDayRow}>
                <Text style={styles.completedDayLabel}>{day.dayLabel}</Text>
                <Text style={styles.completedDayExercises}>
                  {day.exercises && day.exercises.length > 0
                    ? day.exercises.join(', ')
                    : day.muscleGroups.map((m) => MUSCLE_LABELS[m] || m).join(', ')}
                </Text>
              </View>
            ))}
          </View>
        )}
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
  blockLabel: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  nextUpCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent_primary,
    padding: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  nextUpLabel: {
    color: COLORS.accent_primary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  nextUpTitle: {
    color: COLORS.text_primary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  nextUpMuscles: {
    color: COLORS.text_secondary,
    fontSize: 14,
    marginBottom: SPACING.lg,
  },
  startWorkoutBtn: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  startWorkoutBtnText: {
    color: COLORS.text_on_accent,
    fontSize: 16,
    fontWeight: '700',
  },
  weekProgressSection: {
    marginBottom: SPACING.lg,
  },
  weekProgressTitle: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  weekDayPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  weekDayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  weekDayPillDone: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success_subtle,
  },
  weekDayPillNext: {
    borderColor: COLORS.accent_primary,
  },
  weekDayPillText: {
    color: COLORS.text_tertiary,
    fontSize: 13,
    fontWeight: '500',
  },
  weekDayPillTextDone: {
    color: COLORS.success,
  },
  weekDayPillTextNext: {
    color: COLORS.accent_primary,
  },
  weekDayPillCheck: {
    color: COLORS.success,
    fontSize: 12,
    marginLeft: SPACING.xs,
  },
  completedSection: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
  },
  completedSectionTitle: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  completedDayRow: {
    marginBottom: SPACING.sm,
  },
  completedDayLabel: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  completedDayExercises: {
    color: COLORS.text_tertiary,
    fontSize: 13,
  },
});
