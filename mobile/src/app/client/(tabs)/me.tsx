// Client · Me — my coach, my plan and payment details, language, sign out.
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Segmented } from '@/components/Segmented';
import { Sheet } from '@/components/Sheet';
import { toast } from '@/components/Toast';
import { Avatar, Button, Card, Section, Tap, Txt, Screen } from '@/components/ui';
import { leave, useClientData, useClientStatus } from '@/data/client';
import { setLang, setRole } from '@/data/settings';
import { money, relDay } from '@/features/format';
import { parseDayKey } from '@/features/time';
import { useT } from '@/i18n';
import { instagram, whatsapp } from '@/lib/links';
import { color as C, radius, space } from '@/theme/tokens';

export default function Me() {
  const { t, lang } = useT();
  const { view } = useClientData();
  const status = useClientStatus();
  const [confirm, setConfirm] = useState(false);
  if (!view) return <Screen><Txt v="title">{t('tab_me')}</Txt></Screen>;
  const c = view.client;
  const co = view.coach;
  const billing = c.billing_type === 'installment' ? t('bill_installment', { paid: c.parts_paid, parts: c.parts })
    : c.billing_type === 'package' ? t('bill_package', { n: c.months }) : t('bill_monthly');

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: space.md, marginTop: space.md }}>
        <Avatar name={c.name} size={84} tint={C.emberTint} fg={C.emberText} />
        <Txt v="title" style={{ textAlign: 'center' }}>{c.name}</Txt>
        {view.program ? <Txt v="small" c={C.ink2}>{view.program.name}</Txt> : null}
      </View>

      <Section title={t('my_coach')}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar name={co.name} size={52} />
            <View style={{ flex: 1 }}>
              <Txt v="lead">{co.name}</Txt>
              {co.instagram ? <Txt v="small" c={C.ink2}>@{co.instagram.replace(/^@/, '')}</Txt> : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: space.lg }}>
            <Button icon="chat" label="WhatsApp" kind="mint" style={{ flex: 1 }} disabled={!co.phone} onPress={() => whatsapp(co.phone, '')} />
            {co.instagram ? <Button icon="link" label="Instagram" kind="secondary" style={{ flex: 1 }} onPress={() => instagram(co.instagram)} /> : null}
          </View>
        </Card>
      </Section>

      <Section title={t('payment')}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Txt v="numberLg">{money(c.price)}</Txt>
              <Txt v="small" c={C.ink2}>{billing}</Txt>
            </View>
            {c.next_payment ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Txt v="micro" c={C.ink3}>{t('next_payment')}</Txt>
                <Txt v="bodyStrong">{relDay(parseDayKey(c.next_payment), Date.now(), lang)}</Txt>
              </View>
            ) : null}
          </View>
          {co.card ? (
            <Tap onPress={async () => { await Clipboard.setStringAsync(co.card.replace(/\s/g, '')); toast(t('copied')); }}
              style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface2, borderRadius: radius.control, padding: 16 }}>
              <View>
                <Txt v="micro" c={C.ink3}>{t('card_number')}</Txt>
                <Txt v="bodyMd" style={{ marginTop: 2, letterSpacing: 1 }}>{co.card}</Txt>
              </View>
              <Icon name="copy" color={C.ink2} />
            </Tap>
          ) : null}
        </Card>
      </Section>

      <Section title={t('language')}>
        <Segmented value={lang} onChange={setLang} options={[{ key: 'az', label: 'Azərbaycanca' }, { key: 'ru', label: 'Русский' }]} />
      </Section>

      <View style={{ marginTop: space.xxl, alignItems: 'center', gap: space.md }}>
        <Txt v="small" c={C.ink3}>{status.pending ? t('pending_sync', { n: status.pending }) : t('all_synced')}</Txt>
        <Button kind="ghost" icon="logout" label={t('leave')} onPress={() => setConfirm(true)} />
      </View>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title={t('leave_title')}>
        <Txt v="body" c={C.ink2}>{status.pending ? t('leave_pending', { n: status.pending }) : t('leave_text')}</Txt>
        <View style={{ gap: 10, marginTop: space.xl }}>
          <Button kind="danger" label={t('leave')} onPress={async () => { setConfirm(false); await leave(); setRole(null); router.replace('/welcome'); }} />
          <Button kind="secondary" label={t('cancel')} onPress={() => setConfirm(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}
