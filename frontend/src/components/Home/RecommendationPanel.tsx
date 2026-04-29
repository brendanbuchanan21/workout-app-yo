import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

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
  medium: COLORS.accent_primary,
  low: COLORS.success,
};

function splitDetail(detail: string) {
  const separatorIndex = detail.indexOf(': ');
  if (separatorIndex === -1) {
    return { context: null, message: detail };
  }

  return {
    context: detail.slice(0, separatorIndex),
    message: detail.slice(separatorIndex + 2),
  };
}

function compactExerciseList(context: string | null) {
  if (!context) return null;

  const items = context
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length <= 3) return context;

  return `${items.slice(0, 3).join(', ')} + ${items.length - 3} more`;
}

function splitMessage(message: string) {
  const firstSentenceMatch = message.match(/^(.+?[.!?])(\s+.+)?$/);
  if (!firstSentenceMatch) {
    return { preview: message, remainder: '' };
  }

  return {
    preview: firstSentenceMatch[1].trim(),
    remainder: (firstSentenceMatch[2] || '').trim(),
  };
}

export default function RecommendationPanel({ recommendations }: RecommendationPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (recommendations.length === 0) return null;

  const visible = recommendations.slice(0, 3);
  const featured = visible.slice(0, 2);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>INSIGHTS</Text>
      <View style={styles.grid}>
      {featured.map((rec) => {
        const color = PRIORITY_COLORS[rec.priority] || COLORS.text_secondary;
        const { context, message } = splitDetail(rec.detail);
        const compactContext = compactExerciseList(context);
        const isExpanded = expandedId === rec.id;
        const { preview, remainder } = splitMessage(message);
        const fullMessage = remainder ? `${preview} ${remainder}` : preview;
        const isExpandable = Boolean(fullMessage.trim());
        return (
          <Pressable
            key={rec.id}
            style={styles.card}
            onPress={() => setExpandedId((current) => current === rec.id ? null : rec.id)}
          >
            <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
              <Text style={[styles.icon, { color }]}>
                {CATEGORY_ICONS[rec.category] || '?'}
              </Text>
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title}>{rec.title}</Text>
              {compactContext ? (
                <Text style={styles.context}>
                  {compactContext}
                </Text>
              ) : null}
              {isExpanded && isExpandable ? (
                <Text style={styles.detailExpanded}>
                  {fullMessage}
                </Text>
              ) : null}
              {isExpandable ? (
                <Text style={styles.expandHint}>
                  {isExpanded ? 'Show less' : 'Tap for more'}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.text_tertiary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  grid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  card: {
    flex: 1,
    minHeight: 120,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  icon: {
    fontSize: 16,
    fontWeight: '900',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
    marginBottom: 6,
  },
  context: {
    color: COLORS.text_tertiary,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 15,
    marginBottom: 4,
  },
  detail: {
    color: COLORS.text_secondary,
    fontSize: 11,
    lineHeight: 15,
  },
  detailExpanded: {
    color: COLORS.text_secondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  expandHint: {
    color: COLORS.gold_primary,
    fontSize: 11,
    fontWeight: '500',
    marginTop: SPACING.sm,
  },
});
