import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '../src/context/AuthContext';
import { queryClient } from '../src/utils/queryClient';
import { COLORS } from '../src/constants/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.bg_primary },
              animation: 'slide_from_right',
            }}
          />
        </QueryClientProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
