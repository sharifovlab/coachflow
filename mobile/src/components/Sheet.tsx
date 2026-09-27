// Bottom sheet: slides up with a spring, drag the handle/body down to dismiss, tap scrim to close.
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C, gutter, radius, space } from '@/theme/tokens';
import { Txt } from './ui';

export function Sheet({ open, onClose, title, children, scroll = true, maxHeight = 0.88 }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; scroll?: boolean; maxHeight?: number;
}) {
  const { height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const [visible, setVisible] = useState(open);
  const y = useSharedValue(height);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (open) {
      setVisible(true);
      y.value = height;
      y.value = withSpring(0, { damping: 26, stiffness: 260, mass: 0.9 });
      fade.value = withTiming(1, { duration: 200 });
    } else if (visible) {
      fade.value = withTiming(0, { duration: 180 });
      y.value = withTiming(height, { duration: 220 }, (done) => { if (done) runOnJS(setVisible)(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => { y.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) runOnJS(onClose)();
      else y.value = withSpring(0, { damping: 24, stiffness: 260 });
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!visible) return null;
  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent onRequestClose={onClose} animationType="none">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.scrim }, scrimStyle]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="close" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
          <Animated.View style={[st.sheet, { maxHeight: height * maxHeight, paddingBottom: ins.bottom + space.lg }, sheetStyle]}>
            <GestureDetector gesture={pan}>
              <View style={{ paddingTop: 10, paddingBottom: title ? space.sm : space.md }}>
                <View style={st.handle} />
                {title ? <Txt v="titleSm" style={{ paddingHorizontal: gutter, marginTop: space.lg }}>{title}</Txt> : null}
              </View>
            </GestureDetector>
            {scroll ? (
              <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: space.md }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            ) : (
              <View style={{ paddingHorizontal: gutter }}>{children}</View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const st = StyleSheet.create({
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line },
});
