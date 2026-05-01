import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TodayOverview, TodayContext } from "../../types/training";

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
    <View style={styles.glowWrap}>
        <View style={styles.borderGlow} />
        <TouchableOpacity style={styles.workoutCard} onPress={() => router.push('/(tabs)/train')}>
          <View style={styles.workoutCardHeader}>
            <View style={{ flex: 1 }}>
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
          {!!exerciseSummary && (
            <Text style={styles.muscleSummary} numberOfLines={1}>{exerciseSummary}</Text>
          )}
          <Text style={styles.workoutSubtext}>{workoutInfo.subtitle}</Text>
        </TouchableOpacity>
    </View>
  );
};

export default TodaysWorkout;

const styles = StyleSheet.create({
    glowWrap: {
        position: 'relative',
        marginBottom: SPACING.md,
        borderRadius: RADIUS.xl,
      },
      borderGlow: {
        position: 'absolute',
        top: -5,
        left: -5,
        right: -5,
        bottom: -5,
        borderRadius: RADIUS.xl + 5,
        borderWidth: 1,
        borderColor: 'rgba(232, 145, 45, 0.36)',
        shadowColor: COLORS.accent_primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 18,
        backgroundColor: 'transparent',
      },
    workoutCard: {
        padding: SPACING.lg,
        backgroundColor: COLORS.bg_elevated,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(232, 145, 45, 0.46)',
        overflow: 'hidden',
        shadowColor: COLORS.accent_primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
        elevation: 8,
      },
      workoutCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
      },
      muscleSummary: {
        color: COLORS.text_secondary,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: SPACING.sm,
      },
      cardTitle: {
        color: COLORS.text_primary,
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.6,
        textTransform: 'uppercase',
      },
      playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.accent_primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(242,240,237,0.16)',
        shadowColor: COLORS.accent_primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
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
        color: COLORS.text_secondary,
        fontSize: 12,
        fontWeight: '800',
      },
});
