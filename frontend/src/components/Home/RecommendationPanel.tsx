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

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>INSIGHTS</Text>
      {visible.map((rec) => {
        const color = PRIORITY_COLORS[rec.priority] || COLORS.text_secondary;
        const { context, message } = splitDetail(rec.detail);
        const { preview, remainder } = splitMessage(message);
        const isExpanded = expandedId === rec.id;
        const isExpandable = remainder.length > 0;
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
              {context ? (
                <Text style={styles.context}>
                  {context}
                </Text>
              ) : null}
              <Text style={styles.detail}>
                {preview}
              </Text>
              {isExpanded && isExpandable ? (
                <Text style={styles.detailExpanded}>
                  {remainder}
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
    marginBottom: 4,
  },
  context: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    marginBottom: 4,
  },
  detail: {
    color: COLORS.text_secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  detailExpanded: {
    color: COLORS.text_secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  expandHint: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 8,
  },
});
