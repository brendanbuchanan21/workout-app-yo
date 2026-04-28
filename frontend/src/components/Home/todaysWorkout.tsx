import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TodayOverview, TodayContext } from "../../types/training";
import { useState } from "react";

type workoutInfo = {
  title: string;
  subtitle: string;
  isEmpty: boolean;
  isBuildable?: boolean;
}

const TodaysWorkout = ( { workoutInfo, todayOverview, todayContext }: { workoutInfo: workoutInfo, todayOverview: TodayOverview | null, todayContext: TodayContext | null}) => {

    const exercises = todayOverview?.exercises.map((exercise) => exercise.exerciseName) ?? [];

    const visibleExercises = exercises.slice(0, 2);
    const remainingCountExercises = exercises.length - visibleExercises.length;
    const exerciseSummary = remainingCountExercises > 0 ? `${visibleExercises.join(', ')} + ${remainingCountExercises} more` : visibleExercises?.join(', ');

    return (
    <TouchableOpacity style={styles.workoutCard} onPress={() => router.push('/(tabs)/train')}>
          <View style={styles.workoutCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>TODAY'S WORKOUT</Text>
              <Text style={styles.cardTitle}>{workoutInfo.title}</Text>
            </View>
            <View style={styles.playButton}>
              <Ionicons
                name={workoutInfo.isBuildable ? 'add' : 'play'}
                size={workoutInfo.isBuildable ? 22 : 16}
                color={COLORS.text_on_accent}
                style={!workoutInfo.isBuildable ? styles.playIconOffset : undefined}
              />
            </View>
          </View>
            <View style={{ flexDirection: 'row', gap: SPACING.sm}}>
              <Text style={styles.muscleSummary}>{exerciseSummary}</Text>
            </View>
          
          
          <Text style={styles.workoutSubtext}>{workoutInfo.subtitle}</Text>
        </TouchableOpacity>
  );
};

export default TodaysWorkout;

const styles = StyleSheet.create({
    workoutCard: {
        padding: SPACING.lg,
        backgroundColor: COLORS.bg_secondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border_subtle,
        marginBottom: SPACING.md,
      },
      workoutCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
      },
      muscleSummary: {
        color: COLORS.text_secondary,
        fontSize: 14,
        fontWeight: '600',
      },
      cardLabel: {
        color: COLORS.text_tertiary,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 2,
      },
      cardTitle: {
        color: COLORS.text_primary,
        fontSize: 16,
        fontWeight: '600',
      },
      playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.accent_primary,
        alignItems: 'center',
        justifyContent: 'center',
      },
      playIconOffset: {
        marginLeft: 3,
      },
      phaseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.accent_primary,
      },
      workoutSubtext: {
        color: COLORS.text_tertiary,
        fontSize: 12,
        marginTop: SPACING.sm,
      },
});