import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/constants/theme';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/auth/login');
    } else if (!user.displayName) {
      // Not onboarded yet
      router.replace('/auth/onboarding');
    } else if (!user.hasActiveTrainingBlock) {
      // Onboarded but no training plan yet
      router.replace('/training-setup');
    } else {
      router.replace('/(tabs)');
    }
  }, [user, loading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg_primary }}>
      <ActivityIndicator size="large" color={COLORS.accent_primary} />
    </View>
  );
}
