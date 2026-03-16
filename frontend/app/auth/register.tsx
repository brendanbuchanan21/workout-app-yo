import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    try {
      await register(email.trim().toLowerCase(), password);
      router.replace('/auth/onboarding');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your training journey</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.text_tertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor={COLORS.text_tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textContentType="oneTimeCode"
              autoComplete="off"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '◉' : '◎'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm Password"
              placeholderTextColor={COLORS.text_tertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              textContentType="oneTimeCode"
              autoComplete="off"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.eyeIcon}>{showConfirmPassword ? '◉' : '◎'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkAccent}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg_primary,
  },
  inner: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text_primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.text_secondary,
    marginTop: 6,
  },
  form: {
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  input: {
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    fontSize: 16,
    color: COLORS.text_primary,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg_input,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border_subtle,
  },
  passwordInput: {
    flex: 1,
    padding: SPACING.lg,
    fontSize: 16,
    color: COLORS.text_primary,
  },
  eyeButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  eyeIcon: {
    fontSize: 18,
    color: COLORS.text_tertiary,
  },
  button: {
    backgroundColor: COLORS.accent_primary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.text_on_accent,
    fontSize: 16,
    fontWeight: '700',
  },
  linkText: {
    textAlign: 'center',
    color: COLORS.text_secondary,
    fontSize: 14,
  },
  linkAccent: {
    color: COLORS.accent_primary,
    fontWeight: '600',
  },
});
