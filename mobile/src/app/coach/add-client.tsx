// Coach · Add client — 30 seconds from "new client" to a join code sent on WhatsApp.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field } from '@/components/Field';
import { JoinCode } from '@/components/JoinCode';
import { Segmented } from '@/components/Segmented';
import { Stepper } from '@/components/Stepper';
import { Button, Chip, IconButton, Txt } from '@/components/ui';
import { addClient, useCoach, type Client, type NewClient } from '@/data/coach';
import { addDays, dayKey } from '@/features/time';
import { shortDate } from '@/features/format';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { color as C, gutter, space } from '@/theme/tokens';

export default function AddClient() {
  const { t, lang } = useT();
  const ins = useSafeAreaInsets();
  const { lead: leadId } = useLocalSearchParams<{ lead?: string }>();
  const lead = useCoach((s) => s.leads.find((l) => l.id === leadId));
  const programs = useCoach((s) => s.programs);
  const [f, setF] = useState<NewClient>({
    name: lead?.name ?? '', phone: lead?.phone ?? '', lang: lead?.lang ?? 'az', goal: (lead?.goal as NewClient['goal']) ?? 'fit',
    billing_type: 'monthly', price: 120, months: 1, parts: 1, next_payment: dayKey(Date.now()), program_id: programs[0]?.id ?? null,
  });
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [created, setCreated] = useState<Client | null>(null);
  const set = (p: Partial<NewClient>) => setF((x) => ({ ...x, ...p }));

  const save = async () => {
    setBusy(true);
    setErr('');
    const r = await addClient({ ...f, name: f.name.trim(), phone: f.phone.trim(), next_payment: dayKey(addDays(Date.now(), offset)) });
    setBusy(false);
    if (typeof r === 'string') { haptic.warning(); setErr(r); return; }
    haptic.success();
    setCreated(r);
  };

  if (created) {
    return (
      <Animated.View entering={FadeIn} style={{ flex: 1, backgroundColor: C.ground, paddingTop: ins.top + space.xxl, paddingHorizontal: gutter, paddingBottom: ins.bottom + space.xl }}>
        <Txt v="micro" c={C.mintText}>{t('client_added')}</Txt>
        <Txt v="title" style={{ marginTop: 6, marginBottom: space.xxl }}>{t('send_code_to', { name: created.name.split(' ')[0] })}</Txt>
        <JoinCode client={created} />
        <View style={{ flex: 1 }} />
        <Button kind="ghost" label={t('done')} onPress={() => router.replace({ pathname: '/coach/client/[id]', params: { id: created.id } })} />
      </Animated.View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: C.ground }}>
      <View style={{ paddingTop: ins.top + space.sm, paddingHorizontal: gutter, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconButton name="close" label={t('close')} onPress={() => router.back()} />
        <Txt v="titleSm">{t('add_client')}</Txt>
      </View>
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.xl, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Field label={t('name')} value={f.name} onChangeText={(v) => set({ name: v })} autoFocus={!lead} />
        <Field label={t('phone')} value={f.phone} onChangeText={(v) => set({ phone: v })} keyboardType="phone-pad" placeholder="+994 50 123 45 67" />
        <View style={{ gap: 8 }}>
          <Txt v="micro" c={C.ink3}>{t('client_lang')}</Txt>
          <Segmented value={f.lang} onChange={(v) => set({ lang: v })} options={[{ key: 'az', label: 'Azərbaycanca' }, { key: 'ru', label: 'Русский' }]} />
        </View>
        <View style={{ gap: 8 }}>
          <Txt v="micro" c={C.ink3}>{t('goal')}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['lose', 'gain', 'fit', 'rehab'] as const).map((g) => <Chip key={g} label={t(`goal_${g}`)} active={f.goal === g} onPress={() => set({ goal: g })} />)}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Txt v="micro" c={C.ink3}>{t('billing')}</Txt>
          <Segmented value={f.billing_type} onChange={(v) => set({ billing_type: v })}
            options={[{ key: 'monthly', label: t('b_monthly') }, { key: 'package', label: t('b_package') }, { key: 'installment', label: t('b_installment') }]} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stepper label={t('price_azn')} value={f.price} onChange={(v) => set({ price: v ?? 0 })} step={10} max={100000} decimals={0} />
          {f.billing_type === 'package' ? <Stepper label={t('months')} value={f.months} onChange={(v) => set({ months: v ?? 1 })} step={1} min={1} max={24} decimals={0} /> : null}
          {f.billing_type === 'installment' ? <Stepper label={t('parts')} value={f.parts} onChange={(v) => set({ parts: v ?? 1 })} step={1} min={1} max={24} decimals={0} /> : null}
        </View>
        <View style={{ gap: 8 }}>
          <Txt v="micro" c={C.ink3}>{t('first_payment')} · {shortDate(addDays(Date.now(), offset), lang)}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[0, 3, 7, 14, 30].map((d) => <Chip key={d} label={d === 0 ? t('today') : `+${d} ${t('days_short')}`} active={offset === d} onPress={() => setOffset(d)} />)}
          </View>
        </View>
        {programs.length ? (
          <View style={{ gap: 8 }}>
            <Txt v="micro" c={C.ink3}>{t('program')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {programs.map((p) => <Chip key={p.id} label={p.name} active={f.program_id === p.id} onPress={() => set({ program_id: f.program_id === p.id ? null : p.id })} />)}
            </View>
          </View>
        ) : null}
        {err ? <Txt v="smallMd" c={C.danger}>{err}</Txt> : null}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: gutter, paddingBottom: ins.bottom + space.lg, backgroundColor: C.ground }}>
        <Button big label={t('create_get_code')} icon="bolt" onPress={save} loading={busy} disabled={f.name.trim().length < 2} />
      </View>
    </KeyboardAvoidingView>
  );
}
