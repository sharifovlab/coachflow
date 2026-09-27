// Coach · Settings — profile shown to clients (name, phone, card), language, public page, sign out.
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Field } from '@/components/Field';
import { Segmented } from '@/components/Segmented';
import { toast } from '@/components/Toast';
import { Button, IconButton, Section, Txt, Screen } from '@/components/ui';
import { signOut, updateCoach, useCoach } from '@/data/coach';
import { setLang, setRole } from '@/data/settings';
import { WEB_URL } from '@/data/supabase';
import { useT } from '@/i18n';
import { shareText } from '@/lib/links';
import { color as C, space } from '@/theme/tokens';

export default function Settings() {
  const { t, lang } = useT();
  const coach = useCoach((s) => s.coach);
  const [f, setF] = useState({ name: coach?.name ?? '', phone: coach?.phone ?? '', card: coach?.card ?? '', instagram: coach?.instagram ?? '' });
  const [busy, setBusy] = useState(false);
  const link = coach ? `${WEB_URL}/p/${coach.slug}` : '';

  return (
    <Screen tabBar={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconButton name="left" label={t('back')} onPress={() => router.back()} />
        <Txt v="titleSm">{t('settings')}</Txt>
      </View>
      <Section title={t('profile')}>
        <View style={{ gap: space.lg }}>
          <Field label={t('name')} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
          <Field label={t('phone_wa')} value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" />
          <Field label={t('card_number')} value={f.card} onChangeText={(v) => setF({ ...f, card: v })} keyboardType="number-pad" />
          <Field label="Instagram" value={f.instagram} onChangeText={(v) => setF({ ...f, instagram: v })} autoCapitalize="none" />
          <Button label={t('save')} loading={busy} onPress={async () => { setBusy(true); const e = await updateCoach(f); setBusy(false); toast(e ? e : t('saved'), e ? 'close' : 'check'); }} />
        </View>
      </Section>
      <Section title={t('language')}>
        <Segmented value={lang} onChange={(l) => { setLang(l); updateCoach({ lang: l }); }} options={[{ key: 'az', label: 'Azərbaycanca' }, { key: 'ru', label: 'Русский' }]} />
      </Section>
      {link ? (
        <Section title={t('public_page')}>
          <Txt v="small" c={C.ink2} style={{ marginBottom: space.md }}>{t('public_page_hint')}</Txt>
          <Button kind="secondary" icon="share" label={link.replace('https://', '')} onPress={() => shareText(link)} />
        </Section>
      ) : null}
      <View style={{ marginTop: space.xxl }}>
        <Button kind="ghost" icon="logout" label={t('sign_out')} onPress={async () => { await signOut(); setRole(null); router.replace('/welcome'); }} />
      </View>
    </Screen>
  );
}
