import '../src/utils/globalFont';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';

import { FONT_FACE_SOURCES } from '../src/constants/fontFaces';
import { AuthProvider } from '../src/context/AuthContext';
import { queryClient } from '../src/utils/queryClient';
import { COLORS } from '../src/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FONT_FACE_SOURCES);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

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
