// Join: a client types the 6-character code from their coach and gets straight into their plan.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton, Txt } from '@/components/ui';
import { claim } from '@/data/client';
import { setLang, setRole } from '@/data/settings';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { color as C, font, gutter, radius, space } from '@/theme/tokens';

const ALPHABET = /[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g;

export default function Join() {
  const { t } = useT();
  const ins = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [hello, setHello] = useState<{ name: string; coach: string } | null>(null);
  const input = useRef<TextInput>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const clean = (s: string) => s.toUpperCase().replace(/O/g, '0').replace(/I|L/g, '1').replace(ALPHABET, '').slice(0, 6);

  useEffect(() => {
    if (params.code) setCode(clean(String(params.code)));
  }, [params.code]);

  const submit = async (c = code) => {
    if (c.length !== 6 || busy) return;
    setBusy(true);
    setErr('');
    const r = await claim(c);
    setBusy(false);
    if (r.ok) {
      haptic.success();
      setLang(r.lang);
      setRole('client');
      setHello({ name: r.name, coach: r.coach });
      setTimeout(() => router.replace('/client'), 1400);
    } else {
      haptic.warning();
      shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(-6, { duration: 50 }), withTiming(0, { duration: 50 }));
      setErr(r.reason === 'code' ? t('join_bad') : r.reason === 'limit' ? t('join_limit') : t('err_network'));
    }
  };

  useEffect(() => {
    if (code.length === 6) submit(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (hello) {
    return (
      <Animated.View entering={FadeIn} style={{ flex: 1, backgroundColor: C.ground, alignItems: 'center', justifyContent: 'center', padding: gutter }}>
        <Txt v="hero" style={{ textAlign: 'center' }}>{t('join_hello', { name: hello.name.split(' ')[0] })}</Txt>
        <Txt v="body" c={C.ink2} style={{ marginTop: space.md, textAlign: 'center' }}>{t('join_coach', { coach: hello.coach })}</Txt>
      </Animated.View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.ground }}>
      <View style={{ flex: 1, paddingTop: ins.top + space.md, paddingHorizontal: gutter, paddingBottom: ins.bottom + space.xl }}>
        <IconButton name="left" label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />
        <Txt v="title" style={{ marginTop: space.xxl }}>{t('join_title')}</Txt>
        <Txt v="body" c={C.ink2} style={{ marginTop: space.sm }}>{t('join_sub')}</Txt>

        <Pressable onPress={() => input.current?.focus()} accessibilityLabel={t('join_title')}>
          <Animated.View style={[{ flexDirection: 'row', gap: 8, marginTop: 36 }, shakeStyle]}>
            {Array.from({ length: 6 }, (_, i) => {
              const ch = code[i] ?? '';
              const cur = i === code.length;
              return (
                <View key={i} style={{ flex: 1, aspectRatio: 0.8, borderRadius: radius.control, backgroundColor: C.surface2,
                  borderWidth: 2, borderColor: err ? C.danger : cur ? C.ember : ch ? C.line : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  <Txt v="numberLg" style={{ fontFamily: font.display }}>{ch}</Txt>
                </View>
              );
            })}
          </Animated.View>
        </Pressable>
        <TextInput
          ref={input} value={code} onChangeText={(s) => { setErr(''); setCode(clean(s)); }} autoFocus autoCapitalize="characters"
          autoCorrect={false} maxLength={6} style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }} accessibilityLabel={t('join_title')}
        />
        {err ? <Txt v="smallMd" c={C.danger} style={{ marginTop: space.md }}>{err}</Txt> : null}
        <View style={{ flex: 1 }} />
        <Button big label={busy ? t('loading') : t('join_go')} disabled={code.length !== 6} loading={busy} onPress={() => submit()} />
      </View>
    </KeyboardAvoidingView>
  );
}
