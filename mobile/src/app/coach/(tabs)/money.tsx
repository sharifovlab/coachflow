// Coach · Money — how much came in this month, who is late, what is coming. Swipe right to mark paid.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { Ring } from '@/components/Ring';
import { SwipeRow } from '@/components/SwipeRow';
import { toast } from '@/components/Toast';
import { Avatar, Card, IconButton, Section, Tap, Txt, Screen } from '@/components/ui';
import { loadCoach, recordPayment, useCoach } from '@/data/coach';
import { monthMoney, useClientRows, type ClientRow } from '@/data/coachDerived';
import { money, relDay, shortDate } from '@/features/format';
import { parseDayKey } from '@/features/time';
import { useT } from '@/i18n';
import { whatsapp } from '@/lib/links';
import { msg } from '@/lib/messages';
import { useNow } from '@/lib/useNow';
import { color as C, radius, space } from '@/theme/tokens';

const MONTHS = {
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  az: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'],
};

export default function Money() {
  const { t, lang } = useT();
  const now = useNow(60_000);
  const rows = useClientRows(now);
  const payments = useCoach((s) => s.payments);
  const coach = useCoach((s) => s.coach);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const base = new Date(now);
  const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const m = useMemo(() => monthMoney(rows, payments, d.getFullYear(), d.getMonth()), [rows, payments, d.getFullYear(), d.getMonth()]);
  const names = new Map(rows.map((r) => [r.id, r.name]));
  const soon = rows.filter((r) => r.dueIn !== null && r.dueIn >= 0 && r.dueIn <= 14).sort((a, b) => a.dueIn! - b.dueIn!);

  const paid = async (r: ClientRow) => {
    const e = await recordPayment(r.id, r.price);
    toast(e ? t('err_network') : t('paid_ok', { sum: money(r.price) }), e ? 'close' : 'check');
  };
  const row = (r: ClientRow, late: boolean) => (
    <Animated.View key={r.id + (r.next_payment ?? '')} layout={LinearTransition.duration(200)} exiting={FadeOut}>
      <SwipeRow right={{ label: t('mark_paid'), icon: 'check', tint: '#1F1500', bg: C.gold }} left={{ label: 'WhatsApp', icon: 'chat', tint: C.ink, bg: '#1F6F4A' }}
        onRight={() => paid(r)} onLeft={() => whatsapp(r.phone, msg.pay(r.lang, r.name, r.price, coach?.card ?? ''))}>
        <Tap onPress={() => router.push({ pathname: '/coach/client/[id]', params: { id: r.id } })} scaleTo={0.99} feedback="selection"
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: 12, minHeight: 68 }}>
          <Avatar name={r.name} size={40} />
          <View style={{ flex: 1 }}>
            <Txt v="bodyMd" numberOfLines={1}>{r.name}</Txt>
            <Txt v="small" c={late ? C.danger : C.ink3}>{late ? t('overdue_n', { n: -r.dueIn! }) : relDay(parseDayKey(r.next_payment!), now, lang)}</Txt>
          </View>
          <Txt v="bodyStrong" c={late ? C.danger : C.goldText}>{money(r.price)}</Txt>
        </Tap>
      </SwipeRow>
    </Animated.View>
  );

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await loadCoach(); setRefreshing(false); }} refreshing={refreshing}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton name="left" label="←" onPress={() => setOffset(offset - 1)} />
        <Txt v="titleSm">{MONTHS[lang][d.getMonth()]} {d.getFullYear() !== base.getFullYear() ? d.getFullYear() : ''}</Txt>
        <IconButton name="right" label="→" onPress={() => setOffset(offset + 1)} disabled={offset >= 1} />
      </View>

      <Card style={{ marginTop: space.xl, alignItems: 'center', gap: space.md }}>
        <Ring size={170} stroke={14} value={m.expected ? m.receivedSum / m.expected : 0} tint={C.gold}>
          <Txt v="micro" c={C.ink3}>{t('received')}</Txt>
          <Txt v="title" c={C.goldText}>{money(m.receivedSum).replace(' AZN', '')}</Txt>
          <Txt v="small" c={C.ink3}>AZN</Txt>
        </Ring>
        <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
          <View style={{ flex: 1, backgroundColor: C.surface2, borderRadius: radius.tile, padding: 12 }}>
            <Txt v="micro" c={C.ink3}>{t('expected')}</Txt><Txt v="number">{money(m.expected)}</Txt>
          </View>
          <View style={{ flex: 1, backgroundColor: m.overdueSum ? C.dangerTint : C.surface2, borderRadius: radius.tile, padding: 12 }}>
            <Txt v="micro" c={m.overdueSum ? C.danger : C.ink3}>{t('overdue')}</Txt><Txt v="number" c={m.overdueSum ? C.danger : C.ink}>{money(m.overdueSum)}</Txt>
          </View>
        </View>
      </Card>

      {offset === 0 && m.overdue.length ? (
        <Section title={`${t('overdue')} · ${m.overdue.length}`}><View style={{ gap: 8 }}>{m.overdue.map((r) => row(r, true))}</View></Section>
      ) : null}
      {offset === 0 && soon.length ? (
        <Section title={t('next_14')}><View style={{ gap: 8 }}>{soon.map((r) => row(r, false))}</View></Section>
      ) : null}

      <Section title={`${t('received')} · ${m.received.length}`}>
        {m.received.length === 0 ? <Txt v="small" c={C.ink3}>{t('no_payments_month')}</Txt> : (
          <View style={{ backgroundColor: C.surface, borderRadius: radius.tile, paddingHorizontal: space.lg }}>
            {m.received.map((p, i) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                <View style={{ flex: 1 }}>
                  <Txt v="bodyMd" numberOfLines={1}>{names.get(p.client_id) ?? '—'}</Txt>
                  <Txt v="small" c={C.ink3}>{shortDate(parseDayKey(p.paid_on), lang)} · {t(`m_${p.method}` as any)}{p.part ? ` · ${p.part}/${p.parts}` : ''}</Txt>
                </View>
                <Txt v="bodyStrong" c={C.goldText}>{money(p.amount)}</Txt>
              </View>
            ))}
          </View>
        )}
      </Section>
    </Screen>
  );
}
