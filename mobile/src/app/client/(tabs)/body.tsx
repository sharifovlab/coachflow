// Client · Body — the muscle map: what I've loaded (by range) and what has recovered. Tap any muscle for details.
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { BodyMap, READY_PALETTE, readinessLevel } from '@/components/BodyMap';
import { Icon } from '@/components/Icon';
import { Segmented } from '@/components/Segmented';
import { Sheet } from '@/components/Sheet';
import { Bar, Card, IconButton, Section, Tag, Tap, Txt, Screen } from '@/components/ui';
import { useClientData } from '@/data/client';
import { exercisesFor } from '@/features/exercises';
import { kg, relDay } from '@/features/format';
import { balanceInsight } from '@/features/insights';
import { creditsFromSets, heatForRange, rangeWindow } from '@/features/load';
import { MUSCLES, type Muscle } from '@/features/muscles';
import { hoursUntilReady, readiness, stateOf } from '@/features/recovery';
import { DAY } from '@/features/time';
import type { Range, SetLog } from '@/features/types';
import { exercise } from '@/features/exercises';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { useNow } from '@/lib/useNow';
import { color as C, gutter, heat, radius, space } from '@/theme/tokens';

export default function Body() {
  const { t, muscle } = useT();
  const params = useLocalSearchParams<{ mode?: string }>();
  const now = useNow(60_000);
  const { width } = useWindowDimensions();
  const { sets } = useClientData();
  const [mode, setMode] = useState<'load' | 'ready'>(params.mode === 'ready' ? 'ready' : 'load');
  const [range, setRange] = useState<Range>('week');
  const [view, setView] = useState<'front' | 'back'>('front');
  const [sel, setSel] = useState<Muscle | null>(null);

  useEffect(() => { if (params.mode === 'ready') setMode('ready'); }, [params.mode]);

  const load = useMemo(() => heatForRange(sets, range, now), [sets, range, now]);
  const ready = useMemo(() => readiness(sets, now), [sets, now]);
  const week = useMemo(() => creditsFromSets(sets, now - 7 * DAY, now + 1), [sets, now]);
  const insight = useMemo(() => balanceInsight(week), [week]);

  const levels = useMemo(() => {
    if (mode === 'load') return load.levels;
    return Object.fromEntries(MUSCLES.map((m) => [m, readinessLevel(ready[m])])) as Record<Muscle, number>;
  }, [mode, load, ready]);

  // Flip: squash → swap side → unsquash.
  const sx = useSharedValue(1);
  const flipTo = (v: 'front' | 'back') => {
    if (v === view) return;
    haptic.selection();
    sx.value = withSequence(withTiming(0, { duration: 130 }, (f) => { if (f) runOnJS(setView)(v); }), withTiming(1, { duration: 170 }));
  };
  const flip = () => flipTo(view === 'front' ? 'back' : 'front');
  const pan = Gesture.Pan().activeOffsetX([-24, 24]).failOffsetY([-16, 16]).onEnd((e) => { if (Math.abs(e.translationX) > 50) runOnJS(flip)(); });
  const flipStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: sx.value }] }));

  const mapW = Math.min(width - gutter * 2 - 90, 250);
  const rankedLoad = MUSCLES.filter((m) => load.credits[m] > 0).sort((a, b) => load.credits[b] - load.credits[a]).slice(0, 5);
  const ranges: { key: Range; label: string }[] = [
    { key: 'today', label: t('r_today') }, { key: 'week', label: t('r_week') }, { key: 'd7', label: t('r_7') }, { key: 'd30', label: t('r_30') },
  ];

  return (
    <Screen>
      <Txt v="title">{t('body_title')}</Txt>
      <View style={{ marginTop: space.lg }}>
        <Segmented value={mode} onChange={(m) => { setMode(m); haptic.selection(); }} options={[{ key: 'load', label: t('m_load') }, { key: 'ready', label: t('m_ready') }]} />
      </View>

      {mode === 'load' ? (
        <View style={{ marginTop: space.sm }}><Segmented small value={range} onChange={setRange} options={ranges} /></View>
      ) : (
        <Txt v="small" c={C.ink2} style={{ marginTop: space.lg }}>{t('ready_explain')}</Txt>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.lg }}>
        <View style={{ width: 44, gap: 10 }}>
          {(mode === 'load' ? [...heat].reverse() : [...READY_PALETTE]).map((c, i) => (
            <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c }} />
          ))}
          <Txt v="small" c={C.ink3} style={{ fontSize: 10, marginTop: 2 }}>{mode === 'load' ? t('legend_load') : t('legend_ready')}</Txt>
        </View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[{ flex: 1, alignItems: 'center' }, flipStyle]}>
            <BodyMap view={view} levels={levels} width={mapW} palette={mode === 'load' ? heat : READY_PALETTE} selected={sel}
              onPressMuscle={(m) => { haptic.selection(); setSel(m); }} labels={Object.fromEntries(MUSCLES.map((m) => [m, muscle(m)]))} />
          </Animated.View>
        </GestureDetector>
        <View style={{ width: 44, alignItems: 'flex-end' }}>
          <IconButton name="flip" label={t('flip')} onPress={flip} />
        </View>
      </View>
      <View style={{ alignSelf: 'center', marginTop: space.md, width: 200 }}>
        <Segmented small value={view} onChange={flipTo} options={[{ key: 'front', label: t('front') }, { key: 'back', label: t('back_view') }]} />
      </View>
      <Txt v="small" c={C.ink3} style={{ textAlign: 'center', marginTop: space.sm }}>{t('tap_muscle')}</Txt>

      {insight && mode === 'load' ? (
        <Card style={{ marginTop: space.xl, backgroundColor: C.goldTint }}>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Icon name="sparkle" color={C.goldText} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt v="bodyStrong" c={C.goldText}>{t('insight_title')}</Txt>
              <Txt v="small" c={C.ink2}>
                {t('insight_text', { strong: insight.strong.map(muscle).join(' + '), weak: insight.weak.map(muscle).join(' + '), pct: Math.round(insight.ratio * 100) })}
              </Txt>
            </View>
          </View>
        </Card>
      ) : null}

      {mode === 'load' ? (
        <Section title={t('most_loaded')}>
          {rankedLoad.length === 0 ? <Txt v="small" c={C.ink3}>{t('nothing_in_range')}</Txt> : (
            <View style={{ gap: 12 }}>
              {rankedLoad.map((m) => (
                <Tap key={m} onPress={() => setSel(m)} feedback="selection" style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Txt v="bodyMd">{muscle(m)}</Txt>
                    <Txt v="small" c={C.ink2}>{kg(load.credits[m])} / {kg(load.target, 0)}</Txt>
                  </View>
                  <Bar value={load.credits[m] / load.target} tint={heat[Math.max(1, load.levels[m])]} />
                </Tap>
              ))}
            </View>
          )}
        </Section>
      ) : (
        <Section title={t('recovering_now')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MUSCLES.filter((m) => ready[m] < 80).sort((a, b) => ready[a] - ready[b]).map((m) => (
              <Tap key={m} onPress={() => setSel(m)} feedback="selection"><Tag tone={ready[m] < 50 ? 'ember' : 'gold'} label={`${muscle(m)} ${ready[m]}%`} /></Tap>
            ))}
            {MUSCLES.every((m) => ready[m] >= 80) ? <Txt v="small" c={C.mintText}>{t('all_ready')}</Txt> : null}
          </View>
        </Section>
      )}

      <MuscleSheet m={sel} onClose={() => setSel(null)} range={range} now={now} rangeLabel={ranges.find((r) => r.key === range)!.label}
        load={load} ready={ready} sets={sets} />
    </Screen>
  );
}

function MuscleSheet({ m, onClose, range: rg, now: n, rangeLabel, load, ready, sets }: {
  m: Muscle | null; onClose: () => void; range: Range; now: number; rangeLabel: string;
  load: ReturnType<typeof heatForRange>; ready: Record<Muscle, number>; sets: SetLog[];
}) {
  const { t, lang, muscle, ex } = useT();
  const info = useMemo(() => {
    if (!m) return null;
    const { from, to, target } = rangeWindow(rg, n);
    const credits = load.credits[m];
    const hits = sets.filter((s) => { const e = exercise(s.ex); return e && (e.primary.includes(m) || e.secondary.includes(m)); });
    const last = hits.length ? hits[hits.length - 1].at : null;
    const byEx = new Map<string, number>();
    hits.filter((s) => s.at >= from && s.at < to).forEach((s) => byEx.set(s.ex, (byEx.get(s.ex) ?? 0) + 1));
    const top = [...byEx.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const pct = ready[m];
    return { credits, target, last, top, pct, hours: hoursUntilReady(sets, m, n), suggest: exercisesFor(m).slice(0, 3) };
  }, [m, rg, n, load, ready, sets]);
  return (
    <Sheet open={!!m} onClose={onClose} title={m ? muscle(m) : ''}>
      {m && info ? (
        <View style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: C.surface2, borderRadius: radius.tile, padding: 14, gap: 4 }}>
              <Txt v="micro" c={C.ink3}>{rangeLabel}</Txt>
              <Txt v="number">{kg(info.credits)} <Txt v="small" c={C.ink3}>/ {kg(info.target, 0)} {t('sets_short')}</Txt></Txt>
              <Bar value={info.credits / info.target} tint={heat[Math.max(1, load.levels[m])]} height={6} />
            </View>
            <View style={{ flex: 1, backgroundColor: C.surface2, borderRadius: radius.tile, padding: 14, gap: 4 }}>
              <Txt v="micro" c={C.ink3}>{t('m_ready')}</Txt>
              <Txt v="number" c={stateOf(info.pct) === 'ready' ? C.mintText : stateOf(info.pct) === 'recovering' ? C.goldText : C.emberText}>{info.pct}%</Txt>
              <Txt v="small" c={C.ink3}>{info.hours > 0 ? t('ready_in', { h: info.hours }) : t('ready_short')}</Txt>
            </View>
          </View>
          <Txt v="small" c={C.ink2}>{info.last ? t('last_trained', { when: relDay(info.last, n, lang) }) : t('never_trained')}</Txt>
          {info.top.length ? (
            <View style={{ gap: 8 }}>
              <Txt v="micro" c={C.ink3}>{t('what_hit_it')}</Txt>
              {info.top.map(([id, n]) => (
                <View key={id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt v="bodyMd">{ex(id)}</Txt><Txt v="small" c={C.ink2}>{t('sets_n', { n })}</Txt>
                </View>
              ))}
            </View>
          ) : null}
          {load.levels[m] <= 1 ? (
            <View style={{ gap: 8 }}>
              <Txt v="micro" c={C.ink3}>{t('try_these')}</Txt>
              {info.suggest.map((e) => <Txt key={e.id} v="bodyMd">· {e[lang]}</Txt>)}
            </View>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}
