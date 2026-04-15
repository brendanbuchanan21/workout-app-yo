import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete } from '../../src/utils/api';
import { useAuth } from '../../src/context/AuthContext';
import { apiGet, apiPut } from '../../src/utils/api';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  sex: string | null;
  birthDate: string | null;
  heightCm: number | null;
  bodyFatPercent: number | null;
  experienceLevel: string | null;
  activityLevel: string | null;
  daysPerWeek: number | null;
  unitPreference: string;
  createdAt: string;
}

const EXPERIENCE_OPTIONS = ['beginner', 'intermediate', 'advanced'] as const;
const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, under 5k steps' },
  { value: 'lightly_active', label: 'Lightly Active', desc: '5-8k steps' },
  { value: 'moderately_active', label: 'Moderately Active', desc: '8-12k steps' },
  { value: 'very_active', label: 'Very Active', desc: '12k+ steps' },
] as const;
const DAYS_OPTIONS = [3, 4, 5, 6] as const;

function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54);
}


export default function Settings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const res = await apiGet('/user/me');
      if (!res.ok) return null;
      return res.json();
    },
  });

  const user: UserProfile | null = data?.user ?? null;

  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [displayName, setDisplayName] = useState('');
  const [sex, setSex] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCmInput, setHeightCmInput] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [unitPreference, setUnitPreference] = useState('imperial');

  // state for delete account
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    setSex(user.sex || '');
    setUnitPreference(user.unitPreference || 'imperial');
    setExperienceLevel(user.experienceLevel || '');
    setActivityLevel(user.activityLevel || '');
    setDaysPerWeek(user.daysPerWeek || 4);
    if (user.heightCm) {
      const { feet, inches } = cmToFeetInches(user.heightCm);
      setHeightFeet(String(feet));
      setHeightInches(String(inches));
      setHeightCmInput(String(user.heightCm));
    }
  }, [user]);

  const saveField = async (field: string, value: any) => {
    setSaving(true);
    try {
      const res = await apiPut('/user/me', { [field]: value });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
        setEditing(null);
      } else {
        Alert.alert('Error', 'Failed to save changes');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const saveHeight = async () => {
    const isImperial = unitPreference === 'imperial';
    const cm = isImperial
      ? feetInchesToCm(Number(heightFeet), Number(heightInches))
      : Number(heightCmInput);
    if (!cm || cm < 100 || cm > 250) {
      Alert.alert('Invalid height');
      return;
    }
    await saveField('heightCm', cm);
  };

  const formatHeight = (cm: number | null): string => {
    if (!cm) return 'Not set';
    if (unitPreference === 'imperial') {
      const { feet, inches } = cmToFeetInches(cm);
      return `${feet}'${inches}"`;
    }
    return `${cm} cm`;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  const capitalize = (s: string | null | undefined): string => {
    if (!s) return 'Not set';
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
  };

  const logUserOut = async () => {
    await logout();
    router.replace('/auth/login');
  }

  const confirmDeleteAccount = () => {
    setConfirmDeleteMessage(true)
  }
  const deleteAccount = async () => {
    setLoading(true);
    try {
      const res = await apiDelete('/user/me');
      if (res.ok) {
        await logout();
        router.replace('/auth/login');
      } else {
        Alert.alert('Error', 'Failed to delete account');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      Alert.alert('Error', 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent_primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backArrow}>&#x2190;</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Profile Section */}
        <Text style={styles.sectionLabel}>PROFILE</Text>
        <View style={styles.card}>
          {/* Display Name */}
          <SettingsRow
            label="Name"
            value={user?.displayName || 'Not set'}
            editing={editing === 'displayName'}
            onEdit={() => setEditing('displayName')}
          >
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => saveField('displayName', displayName)}
            />
            <SaveCancelButtons
              saving={saving}
              onSave={() => saveField('displayName', displayName)}
              onCancel={() => setEditing(null)}
            />
          </SettingsRow>

          <View style={styles.divider} />

          {/* Sex */}
          <SettingsRow
            label="Sex"
            value={capitalize(user?.sex)}
            editing={editing === 'sex'}
            onEdit={() => setEditing('sex')}
          >
            <View style={styles.optionRow}>
              {(['male', 'female'] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionButton, sex === opt && styles.optionButtonActive]}
                  onPress={() => { setSex(opt); saveField('sex', opt); }}
                >
                  <Text style={[styles.optionText, sex === opt && styles.optionTextActive]}>
                    {capitalize(opt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingsRow>

          <View style={styles.divider} />

          {/* Birthday */}
          <SettingsRow
            label="Birthday"
            value={formatDate(user?.birthDate ?? null)}
          />

          <View style={styles.divider} />

          {/* Height */}
          <SettingsRow
            label="Height"
            value={formatHeight(user?.heightCm ?? null)}
            editing={editing === 'height'}
            onEdit={() => setEditing('height')}
          >
            {unitPreference === 'imperial' ? (
              <View style={styles.optionRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={heightFeet}
                  onChangeText={setHeightFeet}
                  keyboardType="number-pad"
                  placeholder="ft"
                  placeholderTextColor={COLORS.text_tertiary}
                />
                <Text style={styles.unitLabel}>ft</Text>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={heightInches}
                  onChangeText={setHeightInches}
                  keyboardType="number-pad"
                  placeholder="in"
                  placeholderTextColor={COLORS.text_tertiary}
                />
                <Text style={styles.unitLabel}>in</Text>
              </View>
            ) : (
              <View style={styles.optionRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={heightCmInput}
                  onChangeText={setHeightCmInput}
                  keyboardType="number-pad"
                  placeholder="cm"
                  placeholderTextColor={COLORS.text_tertiary}
                />
                <Text style={styles.unitLabel}>cm</Text>
              </View>
            )}
            <SaveCancelButtons
              saving={saving}
              onSave={saveHeight}
              onCancel={() => setEditing(null)}
            />
          </SettingsRow>
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          {/* Units */}
          <SettingsRow
            label="Units"
            value={capitalize(unitPreference)}
            editing={editing === 'units'}
            onEdit={() => setEditing('units')}
          >
            <View style={styles.optionRow}>
              {(['imperial', 'metric'] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionButton, unitPreference === opt && styles.optionButtonActive]}
                  onPress={() => { setUnitPreference(opt); saveField('unitPreference', opt); }}
                >
                  <Text style={[styles.optionText, unitPreference === opt && styles.optionTextActive]}>
                    {capitalize(opt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingsRow>

          <View style={styles.divider} />

          {/* Experience Level */}
          <SettingsRow
            label="Experience"
            value={capitalize(user?.experienceLevel)}
            editing={editing === 'experience'}
            onEdit={() => setEditing('experience')}
          >
            <View style={styles.optionRow}>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionButton, experienceLevel === opt && styles.optionButtonActive]}
                  onPress={() => { setExperienceLevel(opt); saveField('experienceLevel', opt); }}
                >
                  <Text style={[styles.optionText, experienceLevel === opt && styles.optionTextActive]}>
                    {capitalize(opt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingsRow>

          <View style={styles.divider} />

          {/* Activity Level */}
          <SettingsRow
            label="Activity Level"
            value={ACTIVITY_OPTIONS.find(a => a.value === user?.activityLevel)?.label || 'Not set'}
            editing={editing === 'activity'}
            onEdit={() => setEditing('activity')}
          >
            <View style={{ gap: SPACING.xs }}>
              {ACTIVITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.activityOption, activityLevel === opt.value && styles.activityOptionActive]}
                  onPress={() => { setActivityLevel(opt.value); saveField('activityLevel', opt.value); }}
                >
                  <Text style={[styles.activityLabel, activityLevel === opt.value && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.activityDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingsRow>

          <View style={styles.divider} />

          {/* Days Per Week */}
          <SettingsRow
            label="Days Per Week"
            value={user?.daysPerWeek ? `${user.daysPerWeek} days` : 'Not set'}
            editing={editing === 'days'}
            onEdit={() => setEditing('days')}
          >
            <View style={styles.optionRow}>
              {DAYS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionButton, daysPerWeek === opt && styles.optionButtonActive]}
                  onPress={() => { setDaysPerWeek(opt); saveField('daysPerWeek', opt); }}
                >
                  <Text style={[styles.optionText, daysPerWeek === opt && styles.optionTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingsRow>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{user?.email || ''}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Member Since</Text>
            <Text style={styles.rowValue}>{formatDate(user?.createdAt ?? null)}</Text>
          </View>
        </View>

        {/* Permanently Delete Account */}
        {confirmDeleteMessage ? (
          <View style={styles.deleteConfirmContainer}>
            <Text style={styles.deleteConfirmLabel}>Please type this message to confirm:</Text>
            <Text style={styles.deleteConfirmPhrase}>Permanently Delete My Account</Text>
            <TextInput
              style={styles.textInput}
              value={deleteInput}
              onChangeText={setDeleteInput}
              placeholder="Type the message above"
              placeholderTextColor={COLORS.text_tertiary}
              autoFocus
            />
            <View style={styles.deleteConfirmButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setConfirmDeleteMessage(false); setDeleteInput(''); }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteConfirmButton,
                  deleteInput !== 'Permanently Delete My Account' && styles.deleteConfirmButtonDisabled,
                ]}
                disabled={deleteInput !== 'Permanently Delete My Account'}
                onPress={deleteAccount}
              >
                <Text style={styles.deleteConfirmButtonText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setConfirmDeleteMessage(true)}
          >
            <Text style={styles.deleteButtonText}>Permanently Delete Account</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={logUserOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  label, value, editing, onEdit, children,
}: {
  label: string;
  value: string;
  editing?: boolean;
  onEdit?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.rowContainer}>
      <TouchableOpacity style={styles.row} onPress={onEdit} disabled={!onEdit}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!editing && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
            <Text style={styles.rowValue}>{value}</Text>
            {onEdit && <Text style={styles.editChevron}>&#x203A;</Text>}
          </View>
        )}
      </TouchableOpacity>
      {editing && <View style={styles.editArea}>{children}</View>}
    </View>
  );
}

function SaveCancelButtons({
  saving, onSave, onCancel,
}: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.saveRow}>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator size="small" color={COLORS.text_on_accent} />
        ) : (
          <Text style={styles.saveText}>Save</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg_primary,
  },
  scroll: {
    padding: SPACING.xl,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xxl,
  },
  backArrow: {
    color: COLORS.accent_light,
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    color: COLORS.text_primary,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionLabel: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.bg_secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  rowContainer: {},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: 48,
  },
  rowLabel: {
    color: COLORS.text_primary,
    fontSize: 15,
    fontWeight: '500',
  },
  rowValue: {
    color: COLORS.text_secondary,
    fontSize: 15,
  },
  editChevron: {
    color: COLORS.text_tertiary,
    fontSize: 20,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border_subtle,
    marginHorizontal: SPACING.lg,
  },
  editArea: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.text_primary,
    fontSize: 15,
  },
  unitLabel: {
    color: COLORS.text_tertiary,
    fontSize: 14,
    marginHorizontal: SPACING.xs,
  },
  optionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg_input,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: COLORS.accent_primary,
  },
  optionText: {
    color: COLORS.text_secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  optionTextActive: {
    color: COLORS.text_on_accent,
    fontWeight: '600',
  },
  activityOption: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg_input,
  },
  activityOptionActive: {
    backgroundColor: COLORS.accent_primary,
  },
  activityLabel: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  activityDesc: {
    color: COLORS.text_tertiary,
    fontSize: 11,
    marginTop: 2,
  },
  saveRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg_input,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.text_secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent_primary,
    alignItems: 'center',
  },
  saveText: {
    color: COLORS.text_on_accent,
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '500',
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '500',
  },
  deleteConfirmContainer: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  deleteConfirmLabel: {
    color: COLORS.text_secondary,
    fontSize: 14,
  },
  deleteConfirmPhrase: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
  },
  deleteConfirmButtonDisabled: {
    opacity: 0.4,
  },
  deleteConfirmButtonText: {
    color: COLORS.text_on_accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
