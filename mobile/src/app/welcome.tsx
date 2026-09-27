// Welcome: pick a role. The body map breathes behind the headline to show what the app is about.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BodyMap } from '@/components/BodyMap';
import { Segmented } from '@/components/Segmented';
import { Button, Txt } from '@/components/ui';
import { coachStore } from '@/data/coach';
import { setLang, setRole } from '@/data/settings';
import type { Muscle } from '@/features/muscles';
import { useT } from '@/i18n';
import { color as C, gutter, space } from '@/theme/tokens';

const FRAMES: Partial<Record<Muscle, number>>[] = [
  { chest: 4, delts: 3, triceps: 2, abs: 1, quads: 1 },
  { quads: 4, glutes: 3, hamstrings: 2, adductors: 2, calves: 1, abs: 1 },
  { lats: 4, upper_back: 3, biceps: 3, rear_delts: 2, forearms: 1 },
];

export default function Welcome() {
  const { t, lang } = useT();
  const ins = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [f, setF] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setF((x) => (x + 1) % FRAMES.length), 2200);
    return () => clearInterval(id);
  }, []);
  const bodyW = Math.min(width * 0.42, height * 0.2);

  return (
    <View style={{ flex: 1, backgroundColor: C.ground, paddingTop: ins.top + space.md, paddingBottom: ins.bottom + space.xl, paddingHorizontal: gutter }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt v="titleSm" c={C.ink}>Coach<Txt v="titleSm" c={C.ember}>Flow</Txt></Txt>
        <View style={{ width: 120 }}>
          <Segmented small value={lang} onChange={setLang} options={[{ key: 'az', label: 'AZ' }, { key: 'ru', label: 'RU' }]} />
        </View>
      </View>

      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <BodyMap view="front" levels={FRAMES[f]} width={bodyW} stagger={40} />
        <BodyMap view="back" levels={FRAMES[f]} width={bodyW} stagger={40} startDelay={120} />
      </View>

      <Animated.View entering={FadeInDown.duration(500)}>
        <Txt v="hero" style={{ fontSize: 32, lineHeight: 38 }}>{t('welcome_title')}</Txt>
        <Txt v="body" c={C.ink2} style={{ marginTop: space.md, marginBottom: space.xxl }}>{t('welcome_sub')}</Txt>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(120).duration(500)} style={{ gap: space.md }}>
        <Button big label={t('welcome_client')} icon="bolt" onPress={() => router.push('/join')} />
        <Button big kind="secondary" label={t('welcome_coach')} icon="users"
          onPress={() => {
            if (coachStore.get().auth) { setRole('coach'); router.replace('/coach'); } else router.push('/coach-auth');
          }} />
      </Animated.View>
    </View>
  );
}
