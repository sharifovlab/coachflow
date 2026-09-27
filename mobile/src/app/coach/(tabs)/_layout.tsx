// Coach bottom navigation: Today · Clients · Programs · Money.
import { Tabs } from 'expo-router/js-tabs';
import { useMemo } from 'react';
import { TabBar } from '@/components/TabBar';
import { useCoach } from '@/data/coach';
import { useT } from '@/i18n';
import { color as C } from '@/theme/tokens';

export default function CoachTabs() {
  const { t } = useT();
  const leads = useCoach((s) => s.leads);
  const badge = useMemo(() => ({ index: leads.some((l) => l.status === 'new') }), [leads]);
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.ground }, animation: 'shift' }}
      tabBar={(p) => <TabBar {...p} badge={badge} icons={{ index: 'home', clients: 'users', programs: 'clipboard', money: 'wallet' }} />}>
      <Tabs.Screen name="index" options={{ title: t('tab_today') }} />
      <Tabs.Screen name="clients" options={{ title: t('tab_clients') }} />
      <Tabs.Screen name="programs" options={{ title: t('tab_programs') }} />
      <Tabs.Screen name="money" options={{ title: t('tab_money') }} />
    </Tabs>
  );
}
