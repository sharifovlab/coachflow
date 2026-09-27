// Core UI kit: text, pressable with spring + haptic, buttons, chips, cards, screen scaffold.
import { useEffect, type ReactNode } from 'react';
import {
  Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
  type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/lib/haptics';
import { color as C, gutter, radius, space, touch, type as T } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';

type Variant = keyof typeof T;

export function Txt({ v = 'body', c = C.ink, style, ...rest }: TextProps & { v?: Variant; c?: string }) {
  return <Text {...rest} style={[T[v] as TextStyle, { color: c, fontVariant: ['tabular-nums'] }, style]} />;
}

const APress = Animated.createAnimatedComponent(Pressable);

/** Pressable that springs down on touch. `feedback` picks the haptic on press. */
export function Tap({
  children, style, onPress, feedback = 'tap', scaleTo = 0.97, disabled, ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; feedback?: keyof typeof haptic | 'none'; scaleTo?: number; children?: ReactNode }) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APress
      {...rest}
      disabled={disabled}
      onPressIn={(e) => { s.value = withSpring(scaleTo, { damping: 20, stiffness: 400 }); rest.onPressIn?.(e); }}
      onPressOut={(e) => { s.value = withSpring(1, { damping: 14, stiffness: 300 }); rest.onPressOut?.(e); }}
      onPress={(e) => { if (feedback !== 'none') haptic[feedback](); onPress?.(e); }}
      style={[style, a, disabled && { opacity: 0.45 }]}
    >
      {children}
    </APress>
  );
}

export function Button({
  label, onPress, kind = 'primary', icon, disabled, loading, style, big, feedback,
}: {
  label: string; onPress?: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'mint' | 'gold' | 'danger';
  icon?: IconName; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; big?: boolean; feedback?: keyof typeof haptic | 'none';
}) {
  const bg = { primary: C.ember, secondary: C.surface3, ghost: 'transparent', mint: C.mint, gold: C.gold, danger: C.dangerTint }[kind];
  const fg = { primary: C.onEmber, secondary: C.ink, ghost: C.ink2, mint: '#052018', gold: '#1F1500', danger: C.danger }[kind];
  return (
    <Tap
      onPress={onPress}
      disabled={disabled || loading}
      feedback={feedback ?? 'tap'}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[s.btn, { backgroundColor: bg, minHeight: big ? 64 : 52 }, kind === 'ghost' && { borderWidth: 1, borderColor: C.line }, style]}
    >
      {icon ? <Icon name={icon} size={big ? 22 : 20} color={fg} /> : null}
      <Txt v={big ? 'lead' : 'bodyStrong'} c={fg}>{loading ? '…' : label}</Txt>
    </Tap>
  );
}

export function IconButton({ name, onPress, label, tint = C.ink, bg = C.surface2, size = touch, disabled }: {
  name: IconName; onPress?: () => void; label: string; tint?: string; bg?: string; size?: number; disabled?: boolean;
}) {
  return (
    <Tap onPress={onPress} accessibilityLabel={label} accessibilityRole="button" disabled={disabled} scaleTo={0.9}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={Math.round(size * 0.46)} color={tint} />
    </Tap>
  );
}

export function Chip({ label, active, onPress, icon, tone = 'ember' }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName; tone?: 'ember' | 'mint' | 'gold' }) {
  const on = { ember: [C.emberTint, C.emberText], mint: [C.mintTint, C.mintText], gold: [C.goldTint, C.goldText] }[tone];
  return (
    <Tap onPress={onPress} feedback="selection" accessibilityRole="button" accessibilityState={{ selected: !!active }}
      style={[s.chip, { backgroundColor: active ? on[0] : C.surface2, borderColor: active ? on[1] + '55' : 'transparent' }]}>
      {icon ? <Icon name={icon} size={16} color={active ? on[1] : C.ink2} /> : null}
      <Txt v="smallMd" c={active ? on[1] : C.ink2}>{label}</Txt>
    </Tap>
  );
}

/** Small coloured label (non-interactive). */
export function Tag({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'ember' | 'mint' | 'gold' | 'danger'; icon?: IconName }) {
  const [bg, fg] = {
    neutral: [C.surface3, C.ink2], ember: [C.emberTint, C.emberText], mint: [C.mintTint, C.mintText],
    gold: [C.goldTint, C.goldText], danger: [C.dangerTint, C.danger],
  }[tone];
  return (
    <View style={[s.tag, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={13} color={fg} stroke={2.4} /> : null}
      <Txt v="smallMd" c={fg} style={{ fontSize: 12 }}>{label}</Txt>
    </View>
  );
}

export function Card({ children, style, pad = space.xl }: { children: ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  return <View style={[s.card, { padding: pad }, style]}>{children}</View>;
}

export function Section({ title, action, onAction, children, style }: { title: string; action?: string; onAction?: () => void; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: space.xxl }, style]}>
      <View style={s.sectionHead}>
        <Txt v="micro" c={C.ink3}>{title}</Txt>
        {action ? (
          <Tap onPress={onAction} hitSlop={12} feedback="selection"><Txt v="smallMd" c={C.emberText}>{action}</Txt></Tap>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Scrollable screen with safe-area top padding, optional pull-to-refresh and a bottom spacer for the tab bar. */
export function Screen({
  children, onRefresh, refreshing = false, tabBar = true, contentStyle, header,
}: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean; tabBar?: boolean; contentStyle?: StyleProp<ViewStyle>; header?: ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      {header}
      <ScrollView
        contentContainerStyle={[{ paddingTop: header ? space.sm : ins.top + space.lg, paddingHorizontal: gutter, paddingBottom: (tabBar ? 110 : 40) + ins.bottom }, contentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.ember} colors={[C.ember]} progressBackgroundColor={C.surface2} /> : undefined}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** A progress bar that animates to its value. */
export function Bar({ value, tint = C.ember, track = C.surface3, height = 8 }: { value: number; tint?: string; track?: string; height?: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 600 });
  }, [value, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: tint }, a]} />
    </View>
  );
}

export function Avatar({ name, size = 44, tint = C.surface3, fg = C.ink }: { name: string; size?: number; tint?: string; fg?: string }) {
  const init = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '·';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
      <Txt v="bodyStrong" c={fg} style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}>{init}</Txt>
    </View>
  );
}

export function Empty({ icon, title, text, action, onAction }: { icon: IconName; title: string; text?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, gap: space.md }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={28} color={C.ink3} />
      </View>
      <Txt v="lead" style={{ textAlign: 'center' }}>{title}</Txt>
      {text ? <Txt v="small" c={C.ink2} style={{ textAlign: 'center', maxWidth: 280 }}>{text}</Txt> : null}
      {action ? <Button label={action} onPress={onAction} kind="secondary" style={{ marginTop: space.sm, paddingHorizontal: 24 }} /> : null}
    </View>
  );
}

export const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderRadius: radius.pill, paddingHorizontal: space.xl },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  card: { backgroundColor: C.surface, borderRadius: radius.card },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center' },
});
