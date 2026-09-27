// Coach area: tabs plus client card, program builder, add-client and settings. Loads data on entry.
import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { loadCoach, useCoach } from '@/data/coach';
import { color as C } from '@/theme/tokens';

export default function CoachLayout() {
  const auth = useCoach((s) => s.auth);
  useEffect(() => {
    if (!auth) return;
    loadCoach();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') loadCoach(); });
    return () => sub.remove();
  }, [auth]);
  if (!auth) return <Redirect href="/welcome" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.ground }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-client" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
