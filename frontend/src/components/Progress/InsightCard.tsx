import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { Insight } from '../../utils/insights';

interface InsightCardProps {
  insight: Insight;
}

function iconFor(kind: Insight['kind']): string {
  switch (kind) {
    case 'above-ceiling': return '!';
    case 'below-floor': return '+';
    case 'declining': return '\u2193';
    case 'progressing': return '\u2191';
    case 'stalled': return '\u2013';
    case 'regressing': return '\u2193';
    default: return '?';
  }
}

export default function InsightCard({ insight }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const relatedCount = insight.relatedEntityLabels?.length || 0;
  const hasDetails = insight.bullets.length > 0 || !!insight.qualifier || relatedCount > 0;
  const toggleLabel = relatedCount > 0 ? 'Why this insight?' : 'Possible reasons';
  const iconBg = insight.severity === 'warning'
    ? COLORS.warning_subtle
    : insight.severity === 'success'
      ? COLORS.success + '20'
      : COLORS.accent_subtle;
  const iconColor = insight.severity === 'warning'
    ? COLORS.warning
    : insight.severity === 'success'
      ? COLORS.success
      : COLORS.accent_primary;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Text style={[styles.icon, { color: iconColor }]}>{iconFor(insight.kind)}</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{insight.title}</Text>
          <Text style={styles.summary}>{insight.summary}</Text>
          {relatedCount > 0 ? (
            <Text style={styles.relatedPreview}>
              Also affecting {relatedCount} other exercise{relatedCount === 1 ? '' : 's'}
            </Text>
          ) : null}

          {hasDetails ? (
            <TouchableOpacity
              style={styles.expandToggle}
              activeOpacity={0.7}
              onPress={() => setExpanded((current) => !current)}
              accessibilityRole="button"
              accessibilityLabel={expanded ? `Hide ${toggleLabel.toLowerCase()}` : `Show ${toggleLabel.toLowerCase()}`}
            >
              <Text style={styles.expandLabel}>
                {expanded ? `Hide ${toggleLabel.toLowerCase()}` : toggleLabel}
              </Text>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={COLORS.accent_primary}
                style={styles.expandChevron}
              />
            </TouchableOpacity>
          ) : null}

          {expanded ? (
            <View style={styles.detailsWrap}>
              {insight.bullets.map((bullet, idx) => (
                <View key={`${insight.id}-bullet-${idx}`} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>{'\u2022'}</Text>
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
              {insight.qualifier ? (
                <Text style={styles.qualifier}>{insight.qualifier}</Text>
              ) : null}
              {relatedCount > 0 ? (
                <View style={styles.relatedWrap}>
                  <Text style={styles.relatedHeading}>Also showing this pattern</Text>
                  {insight.relatedEntityLabels?.map((label, idx) => (
                    <View key={`${insight.id}-related-${idx}`} style={styles.relatedRow}>
                      <Text style={styles.relatedDot}>{'\u2022'}</Text>
                      <Text style={styles.relatedText}>{label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  icon: {
    fontSize: 16,
    fontWeight: '700',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  summary: {
    color: COLORS.text_primary,
    fontSize: 12,
    lineHeight: 17,
  },
  expandToggle: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  expandLabel: {
    color: COLORS.accent_primary,
    fontSize: 11,
    fontWeight: '600',
  },
  expandChevron: {
    marginLeft: 6,
    marginTop: 1,
  },
  detailsWrap: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border_subtle,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  bulletDot: {
    color: COLORS.text_tertiary,
    width: 12,
    fontSize: 12,
    lineHeight: 17,
  },
  bulletText: {
    flex: 1,
    color: COLORS.text_secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  qualifier: {
    marginTop: SPACING.xs,
    color: COLORS.text_tertiary,
    fontSize: 11,
    lineHeight: 16,
  },
  relatedPreview: {
    marginTop: SPACING.xs,
    color: COLORS.text_tertiary,
    fontSize: 11,
    lineHeight: 15,
  },
  relatedWrap: {
    marginTop: SPACING.sm,
  },
  relatedHeading: {
    color: COLORS.text_primary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  relatedDot: {
    color: COLORS.text_tertiary,
    width: 12,
    fontSize: 12,
    lineHeight: 17,
  },
  relatedText: {
    flex: 1,
    color: COLORS.text_secondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
