// Root: fonts, persisted state, providers, one stack for every screen.
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold } from '@expo-google-fonts/onest';
import { Unbounded_500Medium, Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '@/components/Toast';
import { loadClient } from '@/data/client';
import { initCoachAuth } from '@/data/coach';
import { loadSettings } from '@/data/settings';
import { color as C } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync(C.ground).catch(() => {});

export default function RootLayout() {
  const [fonts] = useFonts({ Unbounded_500Medium, Unbounded_700Bold, Onest_400Regular, Onest_500Medium, Onest_600SemiBold });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadSettings(), loadClient(), initCoachAuth()]).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (fonts && ready) SplashScreen.hideAsync().catch(() => {});
  }, [fonts, ready]);

  if (!fonts || !ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.ground }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.ground }, animation: 'fade_from_bottom' }}>
          <Stack.Screen name="exercise-picker" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
