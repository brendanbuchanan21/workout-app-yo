import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface PathChooserProps {
  onTemplate: () => void;
  onPlan: () => void;
  onBuildAsYouGo: () => void;
}

const PathChooser = ({ onTemplate, onPlan, onBuildAsYouGo }: PathChooserProps) => (
  <View>
    <Text style={styles.headerTitle}>Set Up Your Training</Text>
    <Text style={styles.headerSubtitle}>How would you like to build your program?</Text>

    <TouchableOpacity style={styles.pathCard} onPress={onTemplate}>
      <Text style={styles.pathTitle}>Pick a Template</Text>
      <Text style={styles.pathDesc}>
        Choose from pre-built programs designed for different goals and experience levels. Great if you want a proven structure.
      </Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.pathCard} onPress={onPlan}>
      <Text style={styles.pathTitle}>Build Your Training Block</Text>
      <Text style={styles.pathDesc}>
        Choose your split, adjust volume per muscle group, and customize everything. For lifters who know what they want.
      </Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.pathCard} onPress={onBuildAsYouGo}>
      <Text style={styles.pathTitle}>Build As You Go</Text>
      <Text style={styles.pathDesc}>
        Just pick a split and start training. Build each workout day by day, the app tracks your volume automatically.
      </Text>
    </TouchableOpacity>
  </View>
);

export default PathChooser;

const styles = StyleSheet.create({
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
});
