// app/_layout.jsx
// Root layout — wraps entire app in AuthProvider and sets up the stack

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            {/* Tab screens live inside (tabs) group */}
            <Stack.Screen name="(tabs)" />

            {/* Auth screens */}
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />

            {/* Result screen — opened after a scan or from history */}
            <Stack.Screen name="result" />

            {/* History screen — opened from the History tab */}
            <Stack.Screen name="history" />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
