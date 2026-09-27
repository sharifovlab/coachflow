// One-line toast at the top of the screen.
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStore, useStore } from '@/data/store';
import { color as C, radius } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { Txt } from './ui';

const toastStore = createStore<{ id: number; text: string; icon: IconName }>({ id: 0, text: '', icon: 'check' });
export function toast(text: string, icon: IconName = 'check') {
  toastStore.set((s) => ({ id: s.id + 1, text, icon }));
}

export function ToastHost() {
  const t = useStore(toastStore, (s) => s);
  const ins = useSafeAreaInsets();
  const y = useSharedValue(-120);
  useEffect(() => {
    if (!t.id) return;
    y.value = withSequence(withSpring(0, { damping: 18 }), withDelay(2200, withTiming(-120, { duration: 250 })));
  }, [t.id, y]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: ins.top + 8, left: 16, right: 16, alignItems: 'center' }, a]}>
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface3, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: C.line }}>
        <Icon name={t.icon} size={18} color={C.mintText} />
        <Txt v="bodyMd">{t.text}</Txt>
      </Animated.View>
    </Animated.View>
  );
}
