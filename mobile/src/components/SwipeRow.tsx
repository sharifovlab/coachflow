// Row with swipe actions: swipe right → primary action (done/paid), swipe left → secondary (WhatsApp).
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming, Extrapolation } from 'react-native-reanimated';
import { haptic } from '@/lib/haptics';
import { color as C, radius } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { Txt } from './ui';

const TRIGGER = 96;

export function SwipeRow({ children, right, left, onRight, onLeft }: {
  children: ReactNode;
  right?: { label: string; icon: IconName; tint: string; bg: string };
  left?: { label: string; icon: IconName; tint: string; bg: string };
  onRight?: () => void; onLeft?: () => void;
}) {
  const x = useSharedValue(0);
  const armed = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      let t = e.translationX;
      if (!right && t > 0) t = 0;
      if (!left && t < 0) t = 0;
      x.value = t;
      const a = Math.abs(t) > TRIGGER ? 1 : 0;
      if (a !== armed.value) { armed.value = a; runOnJS(haptic.selection)(); }
    })
    .onEnd(() => {
      if (x.value > TRIGGER && onRight) {
        x.value = withTiming(500, { duration: 200 });
        runOnJS(haptic.success)();
        runOnJS(onRight)();
      } else if (x.value < -TRIGGER && onLeft) {
        x.value = withSpring(0);
        runOnJS(onLeft)();
      } else x.value = withSpring(0, { damping: 18, stiffness: 220 });
      armed.value = 0;
    });

  const front = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const rightBg = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, 30], [0, 1], Extrapolation.CLAMP) }));
  const leftBg = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-30, 0], [1, 0], Extrapolation.CLAMP) }));
  const rightIcon = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(x.value, [0, TRIGGER], [0.6, 1.1], Extrapolation.CLAMP) }] }));
  const leftIcon = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(x.value, [-TRIGGER, 0], [1.1, 0.6], Extrapolation.CLAMP) }] }));

  return (
    <View style={{ borderRadius: radius.tile, overflow: 'hidden' }}>
      {right ? (
        <Animated.View style={[StyleSheet.absoluteFill, st.under, { backgroundColor: right.bg, justifyContent: 'flex-start' }, rightBg]}>
          <Animated.View style={[st.act, rightIcon]}><Icon name={right.icon} color={right.tint} /><Txt v="smallMd" c={right.tint}>{right.label}</Txt></Animated.View>
        </Animated.View>
      ) : null}
      {left ? (
        <Animated.View style={[StyleSheet.absoluteFill, st.under, { backgroundColor: left.bg, justifyContent: 'flex-end' }, leftBg]}>
          <Animated.View style={[st.act, leftIcon]}><Txt v="smallMd" c={left.tint}>{left.label}</Txt><Icon name={left.icon} color={left.tint} /></Animated.View>
        </Animated.View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: C.surface }, front]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const st = StyleSheet.create({
  under: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
