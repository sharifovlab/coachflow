// Coach sign in / sign up with email and password (same account as the web app).
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Segmented } from '@/components/Segmented';
import { Field } from '@/components/Field';
import { Button, IconButton, Txt } from '@/components/ui';
import { signIn, signUp } from '@/data/coach';
import { setRole } from '@/data/settings';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { color as C, gutter, space } from '@/theme/tokens';

export default function CoachAuth() {
  const { t, lang } = useT();
  const ins = useSafeAreaInsets();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const go = async () => {
    setBusy(true);
    setMsg(null);
    if (mode === 'in') {
      const e = await signIn(email, pass);
      setBusy(false);
      if (e) { haptic.warning(); setMsg({ text: /invalid/i.test(e) ? t('auth_wrong') : e }); return; }
    } else {
      const r = await signUp(email, pass, name, lang);
      setBusy(false);
      if (r.error) { haptic.warning(); setMsg({ text: r.error }); return; }
      if (r.needsConfirm) { setMsg({ text: t('auth_confirm'), ok: true }); setMode('in'); return; }
    }
    haptic.success();
    setRole('coach');
    router.replace('/coach');
  };

  const valid = /\S+@\S+\.\S+/.test(email) && pass.length >= 6 && (mode === 'in' || name.trim().length > 1);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: C.ground }}>
      <ScrollView contentContainerStyle={{ paddingTop: ins.top + space.md, paddingHorizontal: gutter, paddingBottom: ins.bottom + space.xl, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <IconButton name="left" label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />
        <Txt v="title" style={{ marginTop: space.xxl }}>{mode === 'in' ? t('auth_in_title') : t('auth_up_title')}</Txt>
        <Txt v="body" c={C.ink2} style={{ marginTop: space.sm, marginBottom: space.xl }}>{t('auth_sub')}</Txt>
        <Segmented value={mode} onChange={setMode} options={[{ key: 'in', label: t('auth_in') }, { key: 'up', label: t('auth_up') }]} />
        <View style={{ gap: space.lg, marginTop: space.xl }}>
          {mode === 'up' ? <Field label={t('auth_name')} value={name} onChangeText={setName} autoComplete="name" /> : null}
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field label={t('auth_pass')} value={pass} onChangeText={setPass} secureTextEntry autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
        </View>
        {msg ? <Txt v="smallMd" c={msg.ok ? C.mintText : C.danger} style={{ marginTop: space.lg }}>{msg.text}</Txt> : null}
        <View style={{ flex: 1, minHeight: space.xxl }} />
        <Button big label={mode === 'in' ? t('auth_in') : t('auth_up')} onPress={go} loading={busy} disabled={!valid} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
