import { useState, useEffect } from 'react';
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
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle(idToken);
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Google Sign-In Failed', err.message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message);
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
          <Text style={styles.title}>Iron Cadence</Text>
          <Text style={styles.subtitle}>Train smarter. Eat better.</Text>
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
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '◉' : '◎'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, (isGoogleLoading || !request) && styles.buttonDisabled]}
            onPress={() => promptAsync()}
            disabled={isGoogleLoading || !request}
          >
            <Text style={styles.googleButtonText}>
              {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/auth/register')}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkAccent}>Sign Up</Text>
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
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.accent_primary,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border_subtle,
  },
  dividerText: {
    color: COLORS.text_tertiary,
    fontSize: 13,
  },
  googleButton: {
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.bg_elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  googleButtonText: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
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
