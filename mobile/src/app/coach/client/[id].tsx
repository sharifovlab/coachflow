// Coach · Client card — is this person training, progressing and paying? Act in one tap.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, View, useWindowDimensions } from 'react-native';
import { BodyPair } from '@/components/BodyMap';
import { ActivityGrid, TrendChart } from '@/components/Charts';
import { Icon } from '@/components/Icon';
import { JoinCode } from '@/components/JoinCode';
import { Segmented } from '@/components/Segmented';
import { Sheet } from '@/components/Sheet';
import { Stepper } from '@/components/Stepper';
import { toast } from '@/components/Toast';
import { Avatar, Button, Card, Chip, IconButton, Section, Tag, Tap, Txt, Screen } from '@/components/ui';
import { deleteClient, photoUrls, recordPayment, updateClient, useCoach } from '@/data/coach';
import { useClientRows } from '@/data/coachDerived';
import { duration, kg, money, relDay, shortDate, WEEKDAYS } from '@/features/format';
import { heatForRange, topMuscles } from '@/features/load';
import { bestByExercise, prTimeline } from '@/features/prs';
import { trend, trendChange, weightPoints } from '@/features/progress';
import { activityGrid, weeklyGoal, weeklyStreak } from '@/features/streak';
import type { Range, Session } from '@/features/types';
import { parseDayKey } from '@/features/time';
import { useT } from '@/i18n';
import { whatsapp } from '@/lib/links';
import { useNow } from '@/lib/useNow';
import { color as C, gutter, radius, space } from '@/theme/tokens';

export default function ClientCard() {
  const { t, lang, ex, muscle } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow(60_000);
  const { width } = useWindowDimensions();
  const rows = useClientRows(now);
  const c = rows.find((r) => r.id === id);
  const allSets = useCoach((s) => s.sets);
  const allSessions = useCoach((s) => s.sessions);
  const reports = useCoach((s) => s.reports);
  const payments = useCoach((s) => s.payments);
  const programs = useCoach((s) => s.programs);
  const [range, setRange] = useState<Range>('d7');
  const [sheet, setSheet] = useState<null | 'pay' | 'code' | 'program' | 'delete' | 'checkday'>(null);
  const [amount, setAmount] = useState<number | null>(c?.price ?? 0);
  const [method, setMethod] = useState<'card' | 'cash' | 'online'>('card');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  const sets = useMemo(() => allSets.filter((s) => s.client === id), [allSets, id]);
  const sessions: Session[] = useMemo(() => allSessions.filter((s) => s.client_id === id).map((s) => ({
    id: s.id, dayId: null, dayName: s.day_name, startedAt: Date.parse(s.started_at), finishedAt: s.finished_at ? Date.parse(s.finished_at) : null, feel: s.feel,
  })), [allSessions, id]);
  const myReports = useMemo(() => reports.filter((r) => r.client_id === id), [reports, id]);
  const program = programs.find((p) => p.id === c?.program_id) ?? null;

  const calc = useMemo(() => {
    const load = heatForRange(sets, range, now);
    const pts = weightPoints(myReports.map((r) => ({ d: r.report_date, kg: r.weight, note: r.note, photo: !!r.photo_path })));
    return {
      load,
      top: topMuscles(load.credits, 3),
      streak: weeklyStreak(sessions, weeklyGoal(program?.days.length ?? 0), now),
      grid: activityGrid(sets.map((s) => s.at), now, 12),
      pts, tr: trend(pts), ch: trendChange(pts, 30, now),
      prs: prTimeline(sets).slice(-5).reverse(),
      best: bestByExercise(sets),
    };
  }, [sets, range, now, myReports, sessions, program]);

  useEffect(() => {
    const paths = myReports.filter((r) => r.photo_path).slice(0, 8).map((r) => r.photo_path!);
    photoUrls(paths).then(setPhotos);
  }, [myReports]);

  if (!c) return <Screen tabBar={false}><IconButton name="left" label={t('back')} onPress={() => router.back()} /></Screen>;

  const pay = async () => {
    if (!amount) return;
    setBusy(true);
    const e = await recordPayment(c.id, amount, method);
    setBusy(false);
    setSheet(null);
    toast(e ? t('err_network') : t('paid_ok', { sum: money(amount) }), e ? 'close' : 'check');
  };
  const recent = [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 6);
  const myPayments = payments.filter((p) => p.client_id === c.id).slice(0, 6);
  const photoReports = myReports.filter((r) => r.photo_path && photos[r.photo_path]);

  return (
    <Screen tabBar={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <IconButton name="left" label={t('back')} onPress={() => router.back()} />
        <IconButton name="trash" label={t('delete')} tint={C.ink3} onPress={() => setSheet('delete')} />
      </View>
      <View style={{ alignItems: 'center', marginTop: space.md, gap: 6 }}>
        <Avatar name={c.name} size={76} tint={C.emberTint} fg={C.emberText} />
        <Txt v="title" style={{ textAlign: 'center' }}>{c.name}</Txt>
        <Txt v="small" c={C.ink2}>{t(`goal_${c.goal}`)} · {c.lastAt ? t('last_seen', { when: relDay(c.lastAt, now, lang) }) : t('no_workouts_yet')}</Txt>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: space.xl }}>
        {[
          { icon: 'chat' as const, label: 'WhatsApp', on: () => whatsapp(c.phone, ''), tint: C.mintText },
          { icon: 'wallet' as const, label: t('payment'), on: () => { setAmount(c.price); setSheet('pay'); }, tint: C.goldText },
          { icon: 'link' as const, label: t('code'), on: () => setSheet('code'), tint: C.emberText },
        ].map((a) => (
          <Tap key={a.label} onPress={a.on} style={{ flex: 1, backgroundColor: C.surface, borderRadius: radius.tile, paddingVertical: 14, alignItems: 'center', gap: 6 }}>
            <Icon name={a.icon} color={a.tint} />
            <Txt v="smallMd" c={C.ink2}>{a.label}</Txt>
          </Tap>
        ))}
      </View>

      {/* Money status */}
      <Card style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.status === 'overdue' ? C.dangerTint : C.surface }} pad={space.lg}>
        <View>
          <Txt v="bodyStrong">{money(c.price)}<Txt v="small" c={C.ink3}> · {c.billing_type === 'installment' ? `${c.parts_paid}/${c.parts}` : t(`b_${c.billing_type}`)}</Txt></Txt>
          <Txt v="small" c={c.status === 'overdue' ? C.danger : C.ink2}>
            {c.next_payment ? `${t('next_payment')}: ${relDay(parseDayKey(c.next_payment), now, lang)}` : t('paid_in_full')}
          </Txt>
        </View>
        {c.dueIn !== null && c.dueIn <= 3 ? <Button kind="gold" label={t('mark_paid')} onPress={() => { setAmount(c.price); setSheet('pay'); }} /> : null}
      </Card>

      {/* Body */}
      <Section title={t('body_title')}>
        <Card>
          <Segmented small value={range} onChange={setRange} options={[{ key: 'week', label: t('r_week') }, { key: 'd7', label: t('r_7') }, { key: 'd30', label: t('r_30') }]} />
          <View style={{ alignItems: 'center', marginTop: space.lg }}>
            <BodyPair levels={calc.load.levels} width={Math.min(width - gutter * 2 - 40, 300)} gap={12} stagger={20} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md, justifyContent: 'center' }}>
            {calc.top.length ? calc.top.map((m) => <Tag key={m} tone="ember" label={`${muscle(m)} · ${kg(calc.load.credits[m])}`} />) : <Txt v="small" c={C.ink3}>{t('nothing_in_range')}</Txt>}
          </View>
        </Card>
      </Section>

      {/* Consistency */}
      <Section title={t('consistency')}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.lg }}>
            <View><Txt v="numberLg">{calc.streak.thisWeek}<Txt v="body" c={C.ink3}>/{calc.streak.goal}</Txt></Txt><Txt v="small" c={C.ink3}>{t('this_week')}</Txt></View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="flame" size={22} color={C.ember} fill={calc.streak.streak ? C.ember : undefined} />
                <Txt v="numberLg">{calc.streak.streak}</Txt>
              </View>
              <Txt v="small" c={C.ink3}>{t('weeks_streak')}</Txt>
            </View>
          </View>
          <ActivityGrid grid={calc.grid} width={width - gutter * 2 - 40} />
        </Card>
      </Section>

      {/* Weight */}
      {calc.pts.length ? (
        <Section title={t('weight_trend')}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt v="numberLg">{kg(calc.tr[calc.tr.length - 1].kg)} <Txt v="small" c={C.ink3}>{t('kg')}</Txt></Txt>
              {calc.ch != null ? <Tag tone={c.goal === 'lose' ? (calc.ch < 0 ? 'mint' : 'gold') : c.goal === 'gain' ? (calc.ch > 0 ? 'mint' : 'gold') : 'neutral'} label={`${calc.ch > 0 ? '+' : ''}${kg(calc.ch)} · 30 ${t('days_short')}`} /> : null}
            </View>
            {calc.pts.length >= 2 ? <View style={{ marginTop: space.md }}><TrendChart points={calc.pts} trend={calc.tr} width={width - gutter * 2 - 40} height={100} /></View> : null}
          </Card>
        </Section>
      ) : null}

      {/* Photos */}
      {photoReports.length ? (
        <Section title={t('photos')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ paddingHorizontal: gutter, gap: 8 }}>
            {photoReports.map((r) => (
              <View key={r.id} style={{ gap: 4 }}>
                <Image source={{ uri: photos[r.photo_path!] }} style={{ width: 120, height: 160, borderRadius: radius.tile, backgroundColor: C.surface2 }} />
                <Txt v="small" c={C.ink3}>{shortDate(parseDayKey(r.report_date), lang)}{r.weight ? ` · ${kg(r.weight)}` : ''}</Txt>
              </View>
            ))}
          </ScrollView>
        </Section>
      ) : null}

      {/* Records */}
      {calc.prs.length ? (
        <Section title={t('records')}>
          <View style={{ gap: 8 }}>
            {calc.prs.map((p) => (
              <View key={`${p.ex}${p.at}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: C.surface, borderRadius: radius.tile, padding: 12 }}>
                <Icon name="trophy" color={C.gold} />
                <View style={{ flex: 1 }}><Txt v="bodyMd">{ex(p.ex)}</Txt><Txt v="small" c={C.ink3}>{kg(p.w)}×{p.r} · {relDay(p.at, now, lang)}</Txt></View>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {/* Sessions */}
      <Section title={t('history')}>
        {recent.length === 0 ? <Txt v="small" c={C.ink3}>{t('no_workouts_yet')}</Txt> : (
          <View style={{ gap: 8 }}>
            {recent.map((s) => {
              const ss = sets.filter((x) => x.sid === s.id);
              const isOpen = open === s.id;
              const groups: Record<string, typeof ss> = {};
              ss.forEach((x) => { (groups[x.ex] ??= []).push(x); });
              return (
                <Tap key={s.id} onPress={() => setOpen(isOpen ? null : s.id)} feedback="selection" scaleTo={0.99}
                  style={{ backgroundColor: C.surface, borderRadius: radius.tile, padding: space.lg, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <View style={{ flex: 1 }}>
                      <Txt v="bodyStrong">{s.dayName || t('workout')}</Txt>
                      <Txt v="small" c={C.ink2}>{relDay(s.startedAt, now, lang)} · {t('sets_n', { n: ss.length })}{s.finishedAt ? ` · ${duration(s.finishedAt - s.startedAt)}` : ''}</Txt>
                    </View>
                    {s.feel ? <Tag label={`${s.feel}/5`} tone={s.feel <= 2 ? 'gold' : 'neutral'} /> : null}
                    <Icon name={isOpen ? 'up' : 'down'} size={20} color={C.ink3} />
                  </View>
                  {isOpen ? Object.entries(groups).map(([e, list]) => (
                    <View key={e}>
                      <Txt v="smallMd">{ex(e)}</Txt>
                      <Txt v="small" c={C.ink3}>{list.map((x) => (x.w != null ? `${kg(x.w)}×${x.r}` : `×${x.r}`)).join('  ·  ')}</Txt>
                    </View>
                  )) : null}
                </Tap>
              );
            })}
          </View>
        )}
      </Section>

      {/* Plan & settings */}
      <Section title={t('plan')}>
        <View style={{ gap: 8 }}>
          <Tap onPress={() => setSheet('program')} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: C.surface, borderRadius: radius.tile, padding: space.lg }}>
            <Icon name="clipboard" color={C.ink2} />
            <View style={{ flex: 1 }}><Txt v="micro" c={C.ink3}>{t('program')}</Txt><Txt v="bodyMd">{program?.name ?? t('not_set')}</Txt></View>
            <Icon name="right" color={C.ink3} />
          </Tap>
          <Tap onPress={() => setSheet('checkday')} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: C.surface, borderRadius: radius.tile, padding: space.lg }}>
            <Icon name="calendar" color={C.ink2} />
            <View style={{ flex: 1 }}><Txt v="micro" c={C.ink3}>{t('check_day')}</Txt><Txt v="bodyMd">{WEEKDAYS[lang][c.check_day]}</Txt></View>
            <Icon name="right" color={C.ink3} />
          </Tap>
        </View>
      </Section>

      {myPayments.length ? (
        <Section title={t('payments')}>
          <View style={{ gap: 6 }}>
            {myPayments.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                <Txt v="body" c={C.ink2}>{shortDate(parseDayKey(p.paid_on), lang)} · {t(`m_${p.method}` as any)}</Txt>
                <Txt v="bodyStrong" c={C.goldText}>{money(p.amount)}</Txt>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Sheet open={sheet === 'pay'} onClose={() => setSheet(null)} title={t('mark_paid')}>
        <Stepper label={t('price_azn')} value={amount} onChange={setAmount} step={10} max={100000} decimals={0} />
        <View style={{ marginTop: space.md }}>
          <Segmented value={method} onChange={setMethod} options={[{ key: 'card', label: t('m_card') }, { key: 'cash', label: t('m_cash') }, { key: 'online', label: t('m_online') }]} />
        </View>
        <Button big kind="gold" label={t('confirm_paid', { sum: money(amount ?? 0) })} onPress={pay} loading={busy} style={{ marginTop: space.xl }} />
      </Sheet>
      <Sheet open={sheet === 'code'} onClose={() => setSheet(null)} title={t('join_code')}>
        <JoinCode client={c} />
      </Sheet>
      <Sheet open={sheet === 'program'} onClose={() => setSheet(null)} title={t('program')}>
        <View style={{ gap: 8 }}>
          {programs.map((p) => (
            <Chip key={p.id} label={p.name} active={c.program_id === p.id} onPress={async () => { await updateClient(c.id, { program_id: p.id }); setSheet(null); toast(t('saved')); }} />
          ))}
          <Button kind="ghost" icon="plus" label={t('new_program')} onPress={() => { setSheet(null); router.push({ pathname: '/coach/program/[id]', params: { id: 'new' } }); }} />
        </View>
      </Sheet>
      <Sheet open={sheet === 'checkday'} onClose={() => setSheet(null)} title={t('check_day')}>
        <Txt v="small" c={C.ink2} style={{ marginBottom: space.md }}>{t('check_day_hint')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {WEEKDAYS[lang].map((d, i) => (
            <Chip key={d} label={d} active={c.check_day === i} onPress={async () => { await updateClient(c.id, { check_day: i }); setSheet(null); }} />
          ))}
        </View>
      </Sheet>
      <Sheet open={sheet === 'delete'} onClose={() => setSheet(null)} title={t('delete_client')}>
        <Txt v="body" c={C.ink2}>{t('delete_client_text', { name: c.name })}</Txt>
        <View style={{ gap: 10, marginTop: space.xl }}>
          <Button kind="danger" icon="trash" label={t('delete')} onPress={async () => { const e = await deleteClient(c.id); setSheet(null); if (!e) router.back(); else toast(e, 'close'); }} />
          <Button kind="secondary" label={t('cancel')} onPress={() => setSheet(null)} />
        </View>
      </Sheet>
    </Screen>
  );
}
