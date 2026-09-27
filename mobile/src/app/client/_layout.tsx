// Client area: tabs plus full-screen workout and completion screens. Syncs on open.
import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { clientStore, refresh, sync } from '@/data/client';
import { useStore } from '@/data/store';
import { color as C } from '@/theme/tokens';

export default function ClientLayout() {
  const token = useStore(clientStore, (s) => s.token);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') sync().then(() => refresh()); });
    return () => sub.remove();
  }, []);
  if (!token) return <Redirect href="/welcome" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.ground } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="workout" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="done" options={{ animation: 'fade', gestureEnabled: false }} />
    </Stack>
  );
}
