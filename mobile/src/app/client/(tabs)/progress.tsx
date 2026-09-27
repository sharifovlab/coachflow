// Client · Progress — am I getting stronger, lighter and more consistent? Weight trend, records, consistency, history.
import { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { ActivityGrid, TrendChart } from '@/components/Charts';
import { Icon } from '@/components/Icon';
import { ReportSheet } from '@/components/ReportSheet';
import { Button, Card, Empty, Section, Tag, Tap, Txt, Screen } from '@/components/ui';
import { refresh, useClientData } from '@/data/client';
import { duration, kg, relDay, shortDate } from '@/features/format';
import { bestByExercise, prTimeline } from '@/features/prs';
import { trend, trendChange, weightPoints } from '@/features/progress';
import { activityGrid } from '@/features/streak';
import { useT } from '@/i18n';
import { useNow } from '@/lib/useNow';
import { color as C, gutter, radius, space } from '@/theme/tokens';

export default function Progress() {
  const { t, lang, ex } = useT();
  const now = useNow(60_000);
  const { width } = useWindowDimensions();
  const { view, sessions, sets } = useClientData();
  const [report, setReport] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const w = useMemo(() => {
    const pts = weightPoints(view?.weights ?? []);
    return { pts, tr: trend(pts), ch: trendChange(pts, 30, now) };
  }, [view, now]);
  const records = useMemo(() => {
    const best = [...bestByExercise(sets).values()];
    const prAt = new Map<string, number>();
    prTimeline(sets).forEach((p) => prAt.set(p.ex, p.at));
    return best.map((b) => ({ ...b, pr: prAt.get(b.ex) ?? null })).sort((a, b) => (b.pr ?? b.at) - (a.pr ?? a.at)).slice(0, 10);
  }, [sets]);
  const grid = useMemo(() => activityGrid(sets.map((s) => s.at), now, 12), [sets, now]);
  const recent = [...sessions].reverse().slice(0, 8);
  const monthCount = sessions.filter((s) => new Date(s.startedAt).getMonth() === new Date(now).getMonth() && new Date(s.startedAt).getFullYear() === new Date(now).getFullYear()).length;

  const goal = view?.client.goal;
  const good = w.ch == null ? null : goal === 'gain' ? w.ch > 0 : goal === 'lose' ? w.ch < 0 : Math.abs(w.ch) < 1;
  const cur = w.tr.length ? w.tr[w.tr.length - 1].kg : null;

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} refreshing={refreshing}>
      <Txt v="title">{t('tab_progress')}</Txt>

      {/* Weight */}
      <Card style={{ marginTop: space.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Txt v="micro" c={C.ink3}>{t('weight_trend')}</Txt>
            <Txt v="hero" style={{ marginTop: 6 }}>{cur != null ? kg(cur) : '—'} <Txt v="body" c={C.ink3}>{t('kg')}</Txt></Txt>
          </View>
          {w.ch != null ? <Tag tone={good ? 'mint' : 'gold'} label={`${w.ch > 0 ? '+' : ''}${kg(w.ch)} ${t('kg')} · 30 ${t('days_short')}`} /> : null}
        </View>
        {w.pts.length >= 2 ? (
          <View style={{ marginTop: space.lg }}>
            <TrendChart points={w.pts} trend={w.tr} width={width - gutter * 2 - 40} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Txt v="small" c={C.ink3}>{shortDate(w.pts[0].t, lang)}</Txt>
              <Txt v="small" c={C.ink3}>{shortDate(w.pts[w.pts.length - 1].t, lang)}</Txt>
            </View>
          </View>
        ) : (
          <Txt v="small" c={C.ink2} style={{ marginTop: space.md }}>{t('weight_empty')}</Txt>
        )}
        <Button kind="secondary" icon="scale" label={t('log_weight')} onPress={() => setReport(true)} style={{ marginTop: space.lg }} />
      </Card>

      {/* Records */}
      <Section title={t('records')}>
        {records.length === 0 ? (
          <Txt v="small" c={C.ink3}>{t('records_empty')}</Txt>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ paddingHorizontal: gutter, gap: 10 }}>
            {records.map((r) => (
              <View key={r.ex} style={{ width: 168, backgroundColor: r.pr && now - r.pr < 14 * 86_400_000 ? C.goldTint : C.surface, borderRadius: radius.tile, padding: 16, gap: 6 }}>
                <Icon name="trophy" size={20} color={r.pr ? C.gold : C.ink3} />
                <Txt v="smallMd" numberOfLines={2} style={{ minHeight: 36 }}>{ex(r.ex)}</Txt>
                <Txt v="number">{kg(r.w)}<Txt v="small" c={C.ink3}> × {r.r}</Txt></Txt>
                <Txt v="small" c={C.ink3} style={{ fontSize: 12 }}>1ПМ ≈ {kg(r.e1rm, 0)} · {relDay(r.pr ?? r.at, now, lang)}</Txt>
              </View>
            ))}
          </ScrollView>
        )}
      </Section>

      {/* Consistency */}
      <Section title={t('consistency')}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.lg }}>
            <View><Txt v="numberLg">{monthCount}</Txt><Txt v="small" c={C.ink3}>{t('this_month')}</Txt></View>
            <View style={{ alignItems: 'flex-end' }}><Txt v="numberLg">{sessions.length}</Txt><Txt v="small" c={C.ink3}>{t('last_120')}</Txt></View>
          </View>
          <ActivityGrid grid={grid} width={width - gutter * 2 - 40} />
          <Txt v="small" c={C.ink3} style={{ marginTop: space.md }}>{t('grid_hint')}</Txt>
        </Card>
      </Section>

      {/* History */}
      <Section title={t('history')}>
        {recent.length === 0 ? <Empty icon="dumbbell" title={t('history_empty')} /> : (
          <View style={{ gap: 8 }}>
            {recent.map((s) => {
              const ss = sets.filter((x) => x.sid === s.id);
              const byEx: { ex: string; list: typeof ss }[] = [];
              ss.forEach((x) => { const g = byEx.find((b) => b.ex === x.ex); if (g) g.list.push(x); else byEx.push({ ex: x.ex, list: [x] }); });
              const isOpen = open === s.id;
              return (
                <Animated.View key={s.id} layout={LinearTransition.duration(220)} style={{ backgroundColor: C.surface, borderRadius: radius.tile, overflow: 'hidden' }}>
                  <Tap onPress={() => setOpen(isOpen ? null : s.id)} feedback="selection" scaleTo={0.99} style={{ padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <View style={{ flex: 1 }}>
                      <Txt v="bodyStrong">{s.dayName || t('workout')}</Txt>
                      <Txt v="small" c={C.ink2}>
                        {relDay(s.startedAt, now, lang)} · {t('sets_n', { n: ss.length })}{s.finishedAt ? ` · ${duration(s.finishedAt - s.startedAt)}` : ''}
                      </Txt>
                    </View>
                    {s.feel ? <Tag label={`${s.feel}/5`} /> : null}
                    <Icon name={isOpen ? 'up' : 'down'} size={20} color={C.ink3} />
                  </Tap>
                  {isOpen ? (
                    <Animated.View entering={FadeIn.duration(200)} style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: 10 }}>
                      {byEx.map((g) => (
                        <View key={g.ex} style={{ gap: 2 }}>
                          <Txt v="smallMd">{ex(g.ex)}</Txt>
                          <Txt v="small" c={C.ink3}>{g.list.map((x) => (x.w != null ? `${kg(x.w)}×${x.r}` : `×${x.r}`)).join('  ·  ')}</Txt>
                        </View>
                      ))}
                    </Animated.View>
                  ) : null}
                </Animated.View>
              );
            })}
          </View>
        )}
      </Section>
      <ReportSheet open={report} onClose={() => setReport(false)} />
    </Screen>
  );
}
