// Circular progress ring (animated).
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { color as C } from '@/theme/tokens';

const AC = Animated.createAnimatedComponent(Circle);

export function Ring({ size, stroke = 10, value, tint = C.ember, track = C.surface3, children, duration = 700 }: {
  size: number; stroke?: number; value: number; tint?: string; track?: string; children?: ReactNode; duration?: number;
}) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, value)), { duration, easing: Easing.out(Easing.cubic) });
  }, [value, duration, p]);
  const ap = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AC cx={size / 2} cy={size / 2} r={r} stroke={tint} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${len} ${len}`} animatedProps={ap} />
      </Svg>
      {children}
    </View>
  );
}
