// Client bottom navigation: Today · Body · Progress · Me.
import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/components/TabBar';
import { useT } from '@/i18n';
import { color as C } from '@/theme/tokens';

export default function ClientTabs() {
  const { t } = useT();
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.ground }, animation: 'shift' }}
      tabBar={(p) => <TabBar {...p} icons={{ index: 'home', body: 'body', progress: 'chart', me: 'user' }} />}>
      <Tabs.Screen name="index" options={{ title: t('tab_today') }} />
      <Tabs.Screen name="body" options={{ title: t('tab_body') }} />
      <Tabs.Screen name="progress" options={{ title: t('tab_progress') }} />
      <Tabs.Screen name="me" options={{ title: t('tab_me') }} />
    </Tabs>
  );
}
