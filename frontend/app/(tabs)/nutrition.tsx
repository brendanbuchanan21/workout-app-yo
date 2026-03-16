import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

interface Meal {
  id: string;
  description: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export default function Nutrition() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showLogForm, setShowLogForm] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // Targets (from nutrition phase — mock for now)
  const targets = { calories: 2100, proteinG: 190, carbsG: 220, fatG: 65 };

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  const handleLogMeal = () => {
    if (!calories || !protein) {
      Alert.alert('Error', 'At least calories and protein are required');
      return;
    }

    const meal: Meal = {
      id: Date.now().toString(),
      description: description || `Meal ${meals.length + 1}`,
      calories: parseInt(calories),
      proteinG: parseFloat(protein),
      carbsG: parseFloat(carbs || '0'),
      fatG: parseFloat(fat || '0'),
    };

    setMeals([...meals, meal]);
    setDescription('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setShowLogForm(false);
  };

  const MacroBar = ({ label, current, target, color }: { label: string; current: number; target: number; color: string }) => {
    const pct = Math.min((current / target) * 100, 100);
    return (
      <View style={styles.macroBarRow}>
        <View style={styles.macroBarLabelRow}>
          <Text style={styles.macroBarLabel}>{label}</Text>
          <Text style={styles.macroBarValues}>
            {Math.round(current)} <Text style={{ color: COLORS.text_tertiary }}>/ {target}</Text>
          </Text>
        </View>
        <View style={styles.macroBarBg}>
          <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.screenTitle}>Nutrition</Text>
        <Text style={styles.dateText}>Today</Text>

        {/* Macro progress */}
        <View style={styles.macroCard}>
          <MacroBar label="Calories" current={totals.calories} target={targets.calories} color={COLORS.accent_primary} />
          <MacroBar label="Protein" current={totals.proteinG} target={targets.proteinG} color={COLORS.success} />
          <MacroBar label="Carbs" current={totals.carbsG} target={targets.carbsG} color={COLORS.warning} />
          <MacroBar label="Fat" current={totals.fatG} target={targets.fatG} color="#A78BFA" />
        </View>

        {/* Meals logged */}
        {meals.map((meal) => (
          <View key={meal.id} style={styles.mealCard}>
            <Text style={styles.mealName}>{meal.description}</Text>
            <View style={styles.mealMacros}>
              <Text style={styles.mealMacro}>{meal.calories} cal</Text>
              <Text style={styles.mealMacro}>{meal.proteinG}g P</Text>
              <Text style={styles.mealMacro}>{meal.carbsG}g C</Text>
              <Text style={styles.mealMacro}>{meal.fatG}g F</Text>
            </View>
          </View>
        ))}

        {/* Log form */}
        {showLogForm && (
          <View style={styles.logForm}>
            <Text style={styles.formTitle}>Log Meal</Text>
            <TextInput
              style={styles.input}
              placeholder="What did you eat?"
              placeholderTextColor={COLORS.text_tertiary}
              value={description}
              onChangeText={setDescription}
            />
            <View style={styles.macroInputs}>
              <TextInput
                style={[styles.input, styles.macroInput]}
                placeholder="Cal"
                placeholderTextColor={COLORS.text_tertiary}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.macroInput]}
                placeholder="Protein"
                placeholderTextColor={COLORS.text_tertiary}
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.macroInput]}
                placeholder="Carbs"
                placeholderTextColor={COLORS.text_tertiary}
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.macroInput]}
                placeholder="Fat"
                placeholderTextColor={COLORS.text_tertiary}
                value={fat}
                onChangeText={setFat}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowLogForm(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleLogMeal}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!showLogForm && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowLogForm(true)}>
            <Text style={styles.addButtonText}>+ Log Meal</Text>
          </TouchableOpacity>
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
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text_primary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.text_secondary,
    marginBottom: SPACING.xl,
  },
  macroCard: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  macroBarRow: {
    gap: 4,
  },
  macroBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroBarLabel: {
    color: COLORS.text_secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  macroBarValues: {
    color: COLORS.text_primary,
    fontSize: 12,
    fontWeight: '600',
  },
  macroBarBg: {
    height: 6,
    backgroundColor: COLORS.bg_input,
    borderRadius: 3,
  },
  macroBarFill: {
    height: 6,
    borderRadius: 3,
  },
  mealCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  mealName: {
    color: COLORS.text_primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: 12,
  },
  mealMacro: {
    color: COLORS.text_tertiary,
    fontSize: 12,
  },
  logForm: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  formTitle: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    fontSize: 14,
    color: COLORS.text_primary,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  macroInputs: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  macroInput: {
    flex: 1,
    textAlign: 'center',
  },
  formButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.bg_elevated,
    borderRadius: RADIUS.md,
  },
  cancelButtonText: {
    color: COLORS.text_secondary,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    padding: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
  },
  saveButtonText: {
    color: COLORS.text_on_accent,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  addButtonText: {
    color: COLORS.text_on_accent,
    fontSize: 15,
    fontWeight: '700',
  },
});
