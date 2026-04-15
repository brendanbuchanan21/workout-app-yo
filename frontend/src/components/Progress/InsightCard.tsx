import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { Insight } from '../../utils/insights';

interface InsightCardProps {
  insight: Insight;
  ctaLabel?: string;
  onPressCta?: () => void;
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

export default function InsightCard({ insight, ctaLabel, onPressCta }: InsightCardProps) {
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
          <Text style={styles.detail}>{insight.detail}</Text>
        </View>
      </View>
      {ctaLabel && onPressCta && (
        <TouchableOpacity style={styles.cta} onPress={onPressCta} activeOpacity={0.7}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    padding: SPACING.lg,
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
    marginBottom: 2,
  },
  detail: {
    color: COLORS.text_secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
    marginLeft: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg_input,
  },
  ctaText: {
    color: COLORS.accent_primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
