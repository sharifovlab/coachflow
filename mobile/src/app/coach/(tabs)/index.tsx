// Coach · Today — what needs me today: money in, people to answer, wins to celebrate. Swipe to act.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { Icon, type IconName } from '@/components/Icon';
import { Ring } from '@/components/Ring';
import { SwipeRow } from '@/components/SwipeRow';
import { toast } from '@/components/Toast';
import { Avatar, Card, Empty, IconButton, Section, Tap, Txt, Screen } from '@/components/ui';
import { loadCoach, markTodo, recordPayment, setLeadStatus, useCoach } from '@/data/coach';
import { agenda, monthMoney, useClientRows, type AgendaItem } from '@/data/coachDerived';
import { kg, money, relDay, shortDate, weekdayLong } from '@/features/format';
import { startOfWeek } from '@/features/time';
import { useT } from '@/i18n';
import { whatsapp } from '@/lib/links';
import { msg } from '@/lib/messages';
import { useNow } from '@/lib/useNow';
import { color as C, radius, space } from '@/theme/tokens';

export default function CoachToday() {
  const { t, lang, ex } = useT();
  const now = useNow(60_000);
  const rows = useClientRows(now);
  const coach = useCoach((s) => s.coach);
  const leads = useCoach((s) => s.leads);
  const reports = useCoach((s) => s.reports);
  const sets = useCoach((s) => s.sets);
  const sessions = useCoach((s) => s.sessions);
  const payments = useCoach((s) => s.payments);
  const done = useCoach((s) => s.todoDone);
  const loading = useCoach((s) => s.loading);
  const [refreshing, setRefreshing] = useState(false);

  const items = useMemo(() => agenda(rows, leads, reports, sets, done, now), [rows, leads, reports, sets, done, now]);
  const d = new Date(now);
  const m = useMemo(() => monthMoney(rows, payments, d.getFullYear(), d.getMonth()), [rows, payments, d.getFullYear(), d.getMonth()]);
  const weekSessions = sessions.filter((s) => Date.parse(s.started_at) >= startOfWeek(now));
  const activeWeek = new Set(weekSessions.map((s) => s.client_id)).size;
  const feed = sessions.slice(0, 5);
  const byId = new Map(rows.map((r) => [r.id, r]));

  const actRight = async (i: AgendaItem) => {
    if (i.kind === 'pay') {
      const e = await recordPayment(i.client.id, i.client.price);
      toast(e ? t('err_network') : t('paid_ok', { sum: money(i.client.price) }), e ? 'close' : 'check');
      return;
    }
    if (i.kind === 'lead') {
      await setLeadStatus(i.lead.id, 'converted');
      router.push({ pathname: '/coach/add-client', params: { lead: i.lead.id } });
      return;
    }
    await markTodo(i.key);
  };
  const actLeft = (i: AgendaItem) => {
    const coachName = coach?.name ?? '';
    if (i.kind === 'pay') return whatsapp(i.client.phone, msg.pay(i.client.lang, i.client.name, i.client.price, coach?.card ?? ''));
    if (i.kind === 'lead') return whatsapp(i.lead.phone, msg.lead(i.lead.lang, i.lead.name, coachName));
    if (i.kind === 'report') return whatsapp(i.client.phone, msg.report(i.client.lang, i.client.name));
    if (i.kind === 'pr') return whatsapp(i.client.phone, msg.pr(i.client.lang, i.client.name, ex(i.ex), `${kg(i.w)}×${i.r}`));
    return whatsapp(i.client.phone, msg.silent(i.client.lang, i.client.name));
  };

  const look = (i: AgendaItem): { icon: IconName; tint: string; bg: string; title: string; sub: string; right: string } => {
    switch (i.kind) {
      case 'pay': {
        const late = i.client.dueIn! < 0;
        return { icon: 'wallet', tint: late ? C.danger : C.goldText, bg: late ? C.dangerTint : C.goldTint, title: i.client.name,
          sub: `${money(i.client.price)} · ${late ? t('overdue_n', { n: -i.client.dueIn! }) : i.client.dueIn === 0 ? t('pay_today') : t('pay_in', { n: i.client.dueIn! })}`, right: t('mark_paid') };
      }
      case 'lead':
        return { icon: 'sparkle', tint: C.emberText, bg: C.emberTint, title: i.lead.name, sub: `${t('new_lead')} · ${t(`goal_${i.lead.goal}` as any)} · ${relDay(Date.parse(i.lead.created_at), now, lang)}`, right: t('make_client') };
      case 'report':
        return { icon: 'scale', tint: C.mintText, bg: C.mintTint, title: i.client.name,
          sub: `${t('new_report')}${i.report.weight ? ` · ${kg(i.report.weight)} ${t('kg')}` : ''}${i.report.photo_path ? ` · ${t('photo')}` : ''}`, right: t('seen') };
      case 'pr':
        return { icon: 'trophy', tint: C.gold, bg: C.goldTint, title: i.client.name, sub: `${t('new_record')}: ${ex(i.ex)} ${kg(i.w)}×${i.r}`, right: t('seen') };
      case 'silent':
        return { icon: 'moon', tint: C.ink2, bg: C.surface3, title: i.client.name,
          sub: i.client.lastAt ? t('silent_for', { when: relDay(i.client.lastAt, now, lang) }) : t('no_workouts_yet'), right: t('dismiss') };
    }
  };

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await loadCoach(); setRefreshing(false); }} refreshing={refreshing}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt v="micro" c={C.ink3}>{weekdayLong(now, lang)}, {shortDate(now, lang)}</Txt>
          <Txt v="title" style={{ marginTop: 6 }}>{t('hi', { name: (coach?.name ?? '').split(' ')[0] })}</Txt>
        </View>
        <IconButton name="settings" label={t('settings')} onPress={() => router.push('/coach/settings')} />
      </View>

      {/* Money pulse */}
      <Tap onPress={() => router.push('/coach/money')} scaleTo={0.98} style={{ marginTop: space.xl }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Ring size={92} stroke={10} value={m.expected ? m.receivedSum / m.expected : 0} tint={C.gold}>
            <Txt v="smallMd" c={C.goldText}>{m.expected ? Math.round((m.receivedSum / m.expected) * 100) : 0}%</Txt>
          </Ring>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="micro" c={C.ink3}>{t('month_in')}</Txt>
            <Txt v="numberLg" c={C.goldText}>{money(m.receivedSum)}</Txt>
            <Txt v="small" c={C.ink2}>{t('of_expected', { sum: money(m.expected) })}</Txt>
            {m.overdueSum > 0 ? <Txt v="smallMd" c={C.danger} style={{ marginTop: 4 }}>{t('overdue_sum', { sum: money(m.overdueSum) })}</Txt> : null}
          </View>
        </Card>
      </Tap>

      {/* Pulse row */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        {[
          { v: `${activeWeek}/${rows.length}`, k: t('trained_week') },
          { v: String(weekSessions.length), k: t('workouts_week') },
          { v: String(leads.filter((l) => l.status === 'new').length), k: t('new_leads') },
        ].map((x) => (
          <View key={x.k} style={{ flex: 1, backgroundColor: C.surface, borderRadius: radius.tile, padding: 14 }}>
            <Txt v="number">{x.v}</Txt>
            <Txt v="small" c={C.ink3} style={{ fontSize: 12 }} numberOfLines={2}>{x.k}</Txt>
          </View>
        ))}
      </View>

      {/* Agenda */}
      <Section title={`${t('todo')} · ${items.length}`}>
        {items.length === 0 ? (
          <Empty icon="check" title={loading ? t('loading') : t('all_clear')} text={loading ? undefined : t('all_clear_sub')} />
        ) : (
          <View style={{ gap: 8 }}>
            <Txt v="small" c={C.ink3} style={{ marginBottom: 4 }}>{t('swipe_hint')}</Txt>
            {items.map((i) => {
              const l = look(i);
              return (
                <Animated.View key={i.key} layout={LinearTransition.duration(220)} exiting={FadeOut.duration(180)}>
                  <SwipeRow
                    right={{ label: l.right, icon: 'check', tint: '#052018', bg: C.mint }}
                    left={{ label: 'WhatsApp', icon: 'chat', tint: C.ink, bg: '#1F6F4A' }}
                    onRight={() => actRight(i)} onLeft={() => actLeft(i)}>
                    <Tap scaleTo={0.99} feedback="selection"
                      onPress={() => (i.kind === 'lead' ? actLeft(i) : router.push({ pathname: '/coach/client/[id]', params: { id: i.client.id } }))}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: 14, minHeight: 72 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: l.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={l.icon} size={20} color={l.tint} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt v="bodyStrong" numberOfLines={1}>{l.title}</Txt>
                        <Txt v="small" c={C.ink2} numberOfLines={1}>{l.sub}</Txt>
                      </View>
                    </Tap>
                  </SwipeRow>
                </Animated.View>
              );
            })}
          </View>
        )}
      </Section>

      {/* Live feed */}
      {feed.length ? (
        <Section title={t('recent_workouts')}>
          <View style={{ gap: 8 }}>
            {feed.map((s) => {
              const c = byId.get(s.client_id);
              if (!c) return null;
              const n = sets.filter((x) => x.sid === s.id).length;
              return (
                <Tap key={s.id} onPress={() => router.push({ pathname: '/coach/client/[id]', params: { id: c.id } })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: C.surface, borderRadius: radius.tile, padding: 12 }}>
                  <Avatar name={c.name} size={40} />
                  <View style={{ flex: 1 }}>
                    <Txt v="bodyMd" numberOfLines={1}>{c.name}</Txt>
                    <Txt v="small" c={C.ink3} numberOfLines={1}>{s.day_name || t('workout')} · {t('sets_n', { n })}{s.feel ? ` · ${s.feel}/5` : ''}</Txt>
                  </View>
                  <Txt v="small" c={C.ink3}>{relDay(Date.parse(s.started_at), now, lang)}</Txt>
                </Tap>
              );
            })}
          </View>
        </Section>
      ) : null}
    </Screen>
  );
}
