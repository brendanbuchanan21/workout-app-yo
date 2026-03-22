import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { SPLIT_LABELS } from '../../constants/training';

interface Template {
  id: string;
  name: string;
  description: string;
  splitType: string;
  daysPerWeek: number;
  lengthWeeks: number;
  difficulty: string;
  days: any[];
}

interface TemplateBrowseProps {
  templates: Template[];
  loading: boolean;
  onSelect: (template: Template) => void;
}

interface TemplateDetailProps {
  template: Template;
  dayOrder: number[];
  setDayOrder: (order: number[]) => void;
}

export const TemplateBrowse = ({ templates, loading, onSelect }: TemplateBrowseProps) => (
  <View>
    <Text style={styles.headerTitle}>Program Templates</Text>
    <Text style={styles.headerSubtitle}>Tap a program to see details</Text>

    {loading ? (
      <ActivityIndicator size="large" color={COLORS.accent_primary} style={{ marginTop: 40 }} />
    ) : (
      templates.map((t) => {
        const totalSets = (t.days as any[]).reduce((sum: number, day: any) =>
          sum + day.exercises.reduce((s: number, ex: any) => s + (ex.sets || 0), 0), 0);

        return (
          <TouchableOpacity
            key={t.id}
            style={styles.templateCard}
            onPress={() => onSelect(t)}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.templateName}>{t.name}</Text>
              <View style={styles.setsBadge}>
                <Text style={styles.setsBadgeText}>{totalSets} sets/wk</Text>
              </View>
            </View>
            <Text style={styles.templateDesc}>{t.description}</Text>
            <View style={styles.templateMeta}>
              <Text style={styles.templateMetaText}>{SPLIT_LABELS[t.splitType] || t.splitType}</Text>
              <Text style={styles.templateMetaDot}> · </Text>
              <Text style={styles.templateMetaText}>{t.daysPerWeek} days/week</Text>
              <Text style={styles.templateMetaDot}> · </Text>
              <Text style={styles.templateMetaText}>{t.lengthWeeks} weeks</Text>
            </View>
          </TouchableOpacity>
        );
      })
    )}
  </View>
);

export const TemplateDetail = ({ template, dayOrder, setDayOrder }: TemplateDetailProps) => {
  const totalSets = (template.days as any[]).reduce((sum: number, day: any) =>
    sum + day.exercises.reduce((s: number, ex: any) => s + (ex.sets || 0), 0), 0);
  const totalExercises = (template.days as any[]).reduce((sum: number, day: any) =>
    sum + day.exercises.length, 0);

  return (
    <View>
      <Text style={styles.headerTitle}>{template.name}</Text>
      <Text style={styles.headerSubtitle}>{template.description}</Text>

      <View style={styles.detailMeta}>
        <View style={styles.detailMetaItem}>
          <Text style={styles.detailMetaLabel}>Split</Text>
          <Text style={styles.detailMetaValue}>{SPLIT_LABELS[template.splitType]}</Text>
        </View>
        <View style={styles.detailMetaItem}>
          <Text style={styles.detailMetaLabel}>Days</Text>
          <Text style={styles.detailMetaValue}>{template.daysPerWeek}/week</Text>
        </View>
        <View style={styles.detailMetaItem}>
          <Text style={styles.detailMetaLabel}>Sets/Week</Text>
          <Text style={styles.detailMetaValue}>{totalSets}</Text>
        </View>
        <View style={styles.detailMetaItem}>
          <Text style={styles.detailMetaLabel}>Exercises</Text>
          <Text style={styles.detailMetaValue}>{totalExercises}</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Weekly Schedule</Text>
      <Text style={{ color: COLORS.text_tertiary, fontSize: 13, marginBottom: SPACING.md, marginTop: -SPACING.sm }}>
        Reorder days to match your preferred schedule
      </Text>
      {dayOrder.map((origIdx, displayIdx) => {
        const day = (template.days as any[])[origIdx];
        if (!day) return null;
        return (
          <View key={origIdx} style={styles.dayCard}>
            <View style={styles.dayCardHeader}>
              <Text style={styles.dayLabel}>{day.dayLabel}</Text>
              <View style={styles.reorderButtons}>
                <TouchableOpacity
                  style={[styles.reorderBtn, displayIdx === 0 && styles.reorderBtnDisabled]}
                  disabled={displayIdx === 0}
                  onPress={() => {
                    const newOrder = [...dayOrder];
                    [newOrder[displayIdx - 1], newOrder[displayIdx]] = [newOrder[displayIdx], newOrder[displayIdx - 1]];
                    setDayOrder(newOrder);
                  }}
                >
                  <Text style={[styles.reorderBtnText, displayIdx === 0 && styles.reorderBtnTextDisabled]}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reorderBtn, displayIdx === dayOrder.length - 1 && styles.reorderBtnDisabled]}
                  disabled={displayIdx === dayOrder.length - 1}
                  onPress={() => {
                    const newOrder = [...dayOrder];
                    [newOrder[displayIdx], newOrder[displayIdx + 1]] = [newOrder[displayIdx + 1], newOrder[displayIdx]];
                    setDayOrder(newOrder);
                  }}
                >
                  <Text style={[styles.reorderBtnText, displayIdx === dayOrder.length - 1 && styles.reorderBtnTextDisabled]}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
            {day.exercises.map((ex: any, j: number) => (
              <View key={j} style={styles.exerciseRow}>
                <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                <Text style={styles.exerciseSets}>{ex.sets}x{ex.repRangeLow}-{ex.repRangeHigh}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
};

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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text_primary,
    marginBottom: SPACING.md,
    marginTop: SPACING.xl,
  },
  templateCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.md,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text_primary,
    flex: 1,
  },
  templateDesc: {
    fontSize: 13,
    color: COLORS.text_secondary,
    marginTop: 6,
    lineHeight: 18,
  },
  templateMeta: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  templateMetaText: {
    fontSize: 12,
    color: COLORS.text_tertiary,
  },
  templateMetaDot: {
    color: COLORS.text_tertiary,
    fontSize: 12,
  },
  setsBadge: {
    backgroundColor: COLORS.accent_subtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  setsBadgeText: {
    color: COLORS.accent_light,
    fontSize: 11,
    fontWeight: '600',
  },
  detailMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  detailMetaItem: {
    flex: 1,
    minWidth: '40%' as any,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  detailMetaLabel: {
    fontSize: 11,
    color: COLORS.text_tertiary,
    marginBottom: 4,
  },
  detailMetaValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text_primary,
  },
  dayCard: {
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accent_light,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  reorderBtn: {
    width: 30,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.bg_input,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  reorderBtnText: {
    fontSize: 12,
    color: COLORS.text_primary,
  },
  reorderBtnTextDisabled: {
    color: COLORS.text_tertiary,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  exerciseName: {
    fontSize: 13,
    color: COLORS.text_secondary,
    flex: 1,
  },
  exerciseSets: {
    fontSize: 13,
    color: COLORS.text_tertiary,
    fontWeight: '600',
  },
});
