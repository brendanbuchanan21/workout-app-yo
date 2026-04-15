import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface Recommendation {
  id: string;
  category: 'volume' | 'progression' | 'deload' | 'phase';
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
}

interface RecommendationPanelProps {
  recommendations: Recommendation[];
}

const CATEGORY_ICONS: Record<string, string> = {
  volume: '\u25A0',
  progression: '\u2191',
  deload: '\u21BB',
  phase: '\u26A1',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: COLORS.warning,
  medium: COLORS.accent,
  low: COLORS.success,
};

export default function RecommendationPanel({ recommendations }: RecommendationPanelProps) {
  if (recommendations.length === 0) return null;

  const visible = recommendations.slice(0, 3);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>INSIGHTS</Text>
      {visible.map((rec) => {
        const color = PRIORITY_COLORS[rec.priority] || COLORS.text_secondary;
        return (
          <View key={rec.id} style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
              <Text style={[styles.icon, { color }]}>
                {CATEGORY_ICONS[rec.category] || '?'}
              </Text>
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title}>{rec.title}</Text>
              <Text style={styles.detail}>{rec.detail}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text_tertiary,
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  icon: {
    fontSize: 14,
    fontWeight: '700',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: COLORS.text_primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  detail: {
    color: COLORS.text_secondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
