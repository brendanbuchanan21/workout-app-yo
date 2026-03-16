import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '../src/context/AuthContext';
import { COLORS } from '../src/constants/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.bg_primary },
            animation: 'slide_from_right',
          }}
        />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
