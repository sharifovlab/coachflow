// Floating bottom navigation with a sliding pill indicator (Material 3 feel, our colours).
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C, radius } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { Tap, Txt } from './ui';

export function TabBar({ state, descriptors, navigation, icons, badge }: BottomTabBarProps & { icons: Record<string, IconName>; badge?: Record<string, boolean> }) {
  const ins = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const routes = state.routes.filter((r) => icons[r.name]);
  const active = routes.findIndex((r) => r.key === state.routes[state.index].key);
  const seg = w / routes.length;
  const x = useSharedValue(0);
  useEffect(() => {
    if (active >= 0) x.value = withSpring(active * seg, { damping: 22, stiffness: 260 });
  }, [active, seg, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  if (active < 0) return null; // full-screen routes hide the bar
  return (
    <View style={{ position: 'absolute', left: 12, right: 12, bottom: Math.max(ins.bottom, 10) + 4 }}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={{ flexDirection: 'row', backgroundColor: C.tabBar, borderRadius: radius.pill, height: 68, borderWidth: 1, borderColor: C.line, alignItems: 'center',
          shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 }}>
        {w > 0 ? (
          <Animated.View style={[{ position: 'absolute', left: 0, width: seg, height: 68, alignItems: 'center', justifyContent: 'center' }, pill]}>
            <View style={{ width: seg - 14, height: 54, borderRadius: radius.pill, backgroundColor: C.emberTint }} />
          </Animated.View>
        ) : null}
        {routes.map((r, i) => {
          const focused = i === active;
          const label = (descriptors[r.key].options.title as string) ?? r.name;
          return (
            <Tap key={r.key} feedback="selection" scaleTo={0.9} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: focused }}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigation.navigate(r.name, r.params);
              }}
              style={{ flex: 1, height: 68, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <View>
                <Icon name={icons[r.name]} size={22} color={focused ? C.emberText : C.ink3} stroke={focused ? 2.3 : 2} />
                {badge?.[r.name] ? <View style={{ position: 'absolute', top: -2, right: -4, width: 9, height: 9, borderRadius: 5, backgroundColor: C.ember, borderWidth: 2, borderColor: C.tabBar }} /> : null}
              </View>
              <Txt v="smallMd" c={focused ? C.ink : C.ink3} style={{ fontSize: 11, lineHeight: 13 }} numberOfLines={1}>{label}</Txt>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}
