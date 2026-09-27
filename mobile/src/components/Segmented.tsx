// Segmented control with a sliding thumb.
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { color as C, radius } from '@/theme/tokens';
import { Tap, Txt } from './ui';

export function Segmented<K extends string>({ options, value, onChange, small }: {
  options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; small?: boolean;
}) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.key === value));
  const seg = w / options.length;
  const thumb = useAnimatedStyle(() => ({
    width: seg - 6,
    transform: [{ translateX: withSpring(idx * seg + 3, { damping: 20, stiffness: 260 }) }],
  }));
  const h = small ? 38 : 46;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', backgroundColor: C.surface2, borderRadius: radius.pill, height: h, alignItems: 'center' }}
      accessibilityRole="tablist">
      {w > 0 ? <Animated.View style={[{ position: 'absolute', top: 3, bottom: 3, borderRadius: radius.pill, backgroundColor: C.surface3 }, thumb]} /> : null}
      {options.map((o) => (
        <Tap key={o.key} onPress={() => o.key !== value && onChange(o.key)} feedback="selection" scaleTo={0.94}
          accessibilityRole="tab" accessibilityState={{ selected: o.key === value }}
          style={{ flex: 1, height: h, alignItems: 'center', justifyContent: 'center' }}>
          <Txt v="smallMd" c={o.key === value ? C.ink : C.ink3} numberOfLines={1}>{o.label}</Txt>
        </Tap>
      ))}
    </View>
  );
}
