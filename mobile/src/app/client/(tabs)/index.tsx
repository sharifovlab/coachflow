// Client · Today — answers "what do I do today, and am I ready for it?" in one glance.
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BodyPair } from '@/components/BodyMap';
import { Icon } from '@/components/Icon';
import { ReportSheet } from '@/components/ReportSheet';
import { Ring } from '@/components/Ring';
import { Sheet } from '@/components/Sheet';
import { toast } from '@/components/Toast';
import { Button, Card, Chip, Section, Tag, Tap, Txt, Screen } from '@/components/ui';
import { refresh, startWorkout, useActive, useClientStatus } from '@/data/client';
import { useClientDerived } from '@/data/derived';
import { dayKey, parseDayKey, daysBetween } from '@/features/time';
import { duration, money, relDay, shortDate, weekdayLong, WEEKDAYS } from '@/features/format';
import { topMuscles } from '@/features/load';
import { REGIONS } from '@/features/muscles';
import { useT } from '@/i18n';
import { useNow } from '@/lib/useNow';
import { color as C, gutter, radius, space } from '@/theme/tokens';

export default function Today() {
  const { t, lang, muscle } = useT();
  const now = useNow();
  const d = useClientDerived(now);
  const active = useActive();
  const status = useClientStatus();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState(false);
  const [streakInfo, setStreakInfo] = useState(false);

  const view = d.view;
  if (!view) {
    return (
      <Screen onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} refreshing={refreshing}>
        <Txt v="title">{t('loading')}</Txt>
        <Txt v="body" c={C.ink2} style={{ marginTop: space.md }}>{t('offline_first_load')}</Txt>
      </Screen>
    );
  }

  const first = view.client.name.split(' ')[0];
  const todayIdx = (new Date(now).getDay() + 6) % 7;
  const reportedToday = view.weights.some((w) => w.d === dayKey(now));
  const reportDay = view.client.check_day === todayIdx && !reportedToday;
  const due = view.client.next_payment ? daysBetween(now, parseDayKey(view.client.next_payment)) : null;
  const showPay = due !== null && due <= 5;
  const heroW = Math.min(width - gutter * 2 - 40, 360) * 0.5;

  const start = () => {
    if (!active && d.day) startWorkout({ programId: d.program?.id ?? null, dayId: d.day.id, dayName: d.day.name || t('day_n', { n: d.dayIndex + 1 }), items: d.day.items });
    if (!active && !d.day) startWorkout({ programId: null, dayId: null, dayName: t('free_workout'), items: [] });
    router.push('/client/workout');
  };

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} refreshing={refreshing}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt v="micro" c={C.ink3}>{weekdayLong(now, lang)}, {shortDate(now, lang)}</Txt>
          <Txt v="title" style={{ marginTop: 6 }}>{t('hi', { name: first })}</Txt>
        </View>
        <Tap onPress={() => setStreakInfo(true)} accessibilityLabel={t('streak')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: d.streak.streak > 0 ? C.emberTint : C.surface2, paddingHorizontal: 14, height: 44, borderRadius: radius.pill }}>
          <Icon name="flame" size={20} color={d.streak.streak > 0 ? C.ember : C.ink3} fill={d.streak.streak > 0 ? C.ember : undefined} />
          <Txt v="number" c={d.streak.streak > 0 ? C.emberText : C.ink2}>{d.streak.streak}</Txt>
        </Tap>
      </View>

      {/* Week strip */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xl }}>
        {d.dots.map((dot, i) => (
          <View key={dot.key} style={{ alignItems: 'center', gap: 6, width: 40 }}>
            <Txt v="small" c={dot.today ? C.ink : C.ink3} style={{ fontSize: 12 }}>{WEEKDAYS[lang][i]}</Txt>
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
              backgroundColor: dot.done ? C.ember : dot.future ? 'transparent' : C.surface2,
              borderWidth: dot.today && !dot.done ? 2 : 0, borderColor: C.ember }}>
              {dot.done ? <Icon name="check" size={16} color={C.onEmber} stroke={3} /> : null}
            </View>
          </View>
        ))}
      </View>
      <Txt v="small" c={C.ink2} style={{ marginTop: space.md }}>
        {d.streak.thisWeek >= d.streak.goal ? t('week_done', { n: d.streak.thisWeek }) : t('week_left', { n: d.streak.goal - d.streak.thisWeek, goal: d.streak.goal })}
      </Txt>

      {status.pending > 0 ? (
        <View style={{ marginTop: space.md }}><Tag tone="gold" icon="timer" label={t('pending_sync', { n: status.pending })} /></View>
      ) : null}

      {/* Hero */}
      <Animated.View entering={FadeInDown.duration(420)}>
        <Card style={{ marginTop: space.xl, overflow: 'hidden' }} pad={0}>
          <View style={{ padding: space.xl, paddingBottom: space.md }}>
            {active ? (
              <>
                <Tag tone="ember" icon="timer" label={t('in_progress')} />
                <Txt v="title" style={{ marginTop: space.md }}>{active.dayName}</Txt>
                <Txt v="small" c={C.ink2} style={{ marginTop: 4 }}>
                  {duration(now - active.startedAt)} · {t('sets_n', { n: active.sets.length })}
                </Txt>
              </>
            ) : d.day ? (
              <>
                <Txt v="micro" c={C.emberText}>{t('next_workout')} · {t('day_of', { n: d.dayIndex + 1, total: d.program!.days.length })}</Txt>
                <Txt v="title" style={{ marginTop: space.sm }}>{d.day.name || t('day_n', { n: d.dayIndex + 1 })}</Txt>
                <Txt v="small" c={C.ink2} style={{ marginTop: 4 }}>
                  {t('exercises_n', { n: d.day.items.length })} · ~{d.minutes} {t('min')}
                </Txt>
              </>
            ) : (
              <>
                <Txt v="micro" c={C.ink3}>{t('no_program')}</Txt>
                <Txt v="titleSm" style={{ marginTop: space.sm }}>{t('no_program_sub')}</Txt>
              </>
            )}
          </View>
          {d.plan && !active ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, gap: space.lg }}>
              <BodyPair levels={d.plan.levels} width={heroW} gap={6} stagger={25} />
              <View style={{ flex: 1, gap: 8 }}>
                <Txt v="micro" c={C.ink3}>{t('targets')}</Txt>
                {topMuscles(d.plan.credits, 4).map((m) => {
                  const r = d.ready[m];
                  return (
                    <View key={m} style={{ gap: 2 }}>
                      <Txt v="smallMd">{muscle(m)}</Txt>
                      <Txt v="small" c={r >= 80 ? C.mintText : r >= 50 ? C.goldText : C.emberText} style={{ fontSize: 12 }}>
                        {r >= 80 ? t('ready_short') : t('ready_pct', { n: r })}
                      </Txt>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
          <View style={{ padding: space.xl, paddingTop: space.lg }}>
            <Button big label={active ? t('continue') : d.day ? t('start') : t('free_workout')} icon={active ? 'play' : 'bolt'} onPress={start} feedback="heavy" />
          </View>
        </Card>
      </Animated.View>

      {/* Check-in nudge */}
      {reportDay ? (
        <Tap onPress={() => setReport(true)} style={{ marginTop: space.md, backgroundColor: C.mintTint, borderRadius: radius.tile, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.mintDeep, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="scale" color={C.mintText} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="bodyStrong" c={C.mintText}>{t('report_day')}</Txt>
            <Txt v="small" c={C.ink2}>{t('report_day_sub')}</Txt>
          </View>
          <Icon name="right" color={C.mintText} />
        </Tap>
      ) : null}

      {/* Readiness */}
      <Section title={t('readiness')} action={t('open_map')} onAction={() => router.push({ pathname: '/client/body', params: { mode: 'ready' } })}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {d.regions.map((g) => {
            const reg = REGIONS.find((x) => x.id === g.id)!;
            const tint = g.state === 'ready' ? C.mint : g.state === 'recovering' ? C.gold : C.ember;
            return (
              <Tap key={g.id} onPress={() => router.push({ pathname: '/client/body', params: { mode: 'ready' } })}
                style={{ width: (width - gutter * 2 - 20) / 3, backgroundColor: C.surface, borderRadius: radius.tile, padding: 12, alignItems: 'center', gap: 8 }}>
                <Ring size={54} stroke={6} value={g.pct / 100} tint={tint}>
                  <Txt v="smallMd" style={{ fontSize: 13 }}>{g.pct}</Txt>
                </Ring>
                <Txt v="smallMd" c={C.ink2}>{reg.label[lang]}</Txt>
              </Tap>
            );
          })}
        </View>
      </Section>

      {/* Payment */}
      {showPay ? (
        <Section title={t('payment')}>
          <Card style={{ backgroundColor: due! < 0 ? C.dangerTint : C.goldTint }}>
            <Txt v="micro" c={due! < 0 ? C.danger : C.goldText}>
              {due! < 0 ? t('pay_overdue', { n: -due! }) : due === 0 ? t('pay_today') : t('pay_in', { n: due! })}
            </Txt>
            <Txt v="numberLg" style={{ marginTop: 6 }}>{money(view.client.price)}</Txt>
            <Txt v="small" c={C.ink2} style={{ marginTop: 2 }}>{relDay(parseDayKey(view.client.next_payment!), now, lang)} · {view.coach.name}</Txt>
            {view.coach.card ? (
              <Tap onPress={async () => { await Clipboard.setStringAsync(view.coach.card.replace(/\s/g, '')); toast(t('copied')); }}
                style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: radius.control, padding: 14 }}>
                <Txt v="bodyMd">{view.coach.card}</Txt>
                <Icon name="copy" size={20} color={C.goldText} />
              </Tap>
            ) : null}
          </Card>
        </Section>
      ) : null}

      {/* Last workout */}
      {d.lastSession ? (
        <Section title={t('last_workout')}>
          <Tap onPress={() => router.push('/client/progress')} style={{ backgroundColor: C.surface, borderRadius: radius.tile, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="dumbbell" color={C.ink2} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="bodyStrong">{d.lastSession.dayName || t('workout')}</Txt>
              <Txt v="small" c={C.ink2}>
                {relDay(d.lastSession.startedAt, now, lang)} · {t('sets_n', { n: d.sets.filter((s) => s.sid === d.lastSession!.id).length })}
                {d.lastSession.finishedAt ? ` · ${duration(d.lastSession.finishedAt - d.lastSession.startedAt)}` : ''}
              </Txt>
            </View>
            <Icon name="right" color={C.ink3} />
          </Tap>
        </Section>
      ) : null}

      {!reportDay ? (
        <View style={{ marginTop: space.xl, alignItems: 'flex-start' }}>
          <Chip icon="scale" label={t('report_now')} onPress={() => setReport(true)} />
        </View>
      ) : null}

      <ReportSheet open={report} onClose={() => setReport(false)} />
      <Sheet open={streakInfo} onClose={() => setStreakInfo(false)} title={t('streak_title', { n: d.streak.streak })}>
        <Txt v="body" c={C.ink2}>{t('streak_explain', { goal: d.streak.goal })}</Txt>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: space.xl, marginBottom: space.md }}>
          {Array.from({ length: d.streak.goal }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: i < d.streak.thisWeek ? C.ember : C.surface3 }} />
          ))}
        </View>
        <Txt v="small" c={C.ink3}>{t('streak_week', { n: d.streak.thisWeek, goal: d.streak.goal })}</Txt>
      </Sheet>
    </Screen>
  );
}
