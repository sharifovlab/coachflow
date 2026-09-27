// Client · Workout player — log each set in one tap, rest with a timer, see the muscles you are working.
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BodyMap } from '@/components/BodyMap';
import { Icon } from '@/components/Icon';
import { Ring } from '@/components/Ring';
import { Sheet } from '@/components/Sheet';
import { Stepper } from '@/components/Stepper';
import { toast } from '@/components/Toast';
import { Button, IconButton, Tag, Tap, Txt } from '@/components/ui';
import { discardWorkout, finishWorkout, logSet, undoLastSet, updateActive, useActive, useClientData } from '@/data/client';
import { openPicker } from '@/data/picker';
import { exercise } from '@/features/exercises';
import { clock, duration, kg } from '@/features/format';
import { viewOf, type Muscle } from '@/features/muscles';
import { lastPerformance, repsTarget } from '@/features/program';
import { bestByExercise, e1rm } from '@/features/prs';
import type { PlanItem } from '@/features/types';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { color as C, gutter, radius, space } from '@/theme/tokens';

function useTick(ms: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export default function Workout() {
  const { t, muscle, ex: exName } = useT();
  const ins = useSafeAreaInsets();
  const a = useActive();
  const { sets: history } = useClientData();
  const now = useTick(250);
  const [listOpen, setListOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [w, setW] = useState<number | null>(null);
  const [r, setR] = useState<number | null>(10);
  const restDone = useRef<number | null>(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setExitOpen(true); return true; });
    return () => sub.remove();
  }, []);

  const item: PlanItem | undefined = a?.items[a.cur];
  const e = item ? exercise(item.ex) : undefined;
  const doneHere = a && item ? a.sets.filter((s) => s.order === a.cur) : [];
  const setIdx = doneHere.length;
  const prev = useMemo(() => (item && a ? lastPerformance(item.ex, history, a.id) : []), [item, history, a]);
  const best = useMemo(() => (item ? bestByExercise(history.filter((s) => s.ex === item.ex)).get(item.ex) : undefined), [item, history]);
  const bodyweight = e?.equipment === 'bodyweight';

  // Prefill weight/reps whenever the exercise or set number changes.
  useEffect(() => {
    if (!item) return;
    const lastHere = doneHere[doneHere.length - 1];
    const p = prev[Math.min(setIdx, prev.length - 1)];
    if (lastHere) { setW(lastHere.w); setR(lastHere.r); }
    else if (p) { setW(p.w); setR(p.r); }
    else { setW(bodyweight ? null : 20); setR(repsTarget(item.reps)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a?.cur, setIdx, item?.ex]);

  // Rest finished → buzz once.
  const resting = !!a?.restUntil && a.restUntil > now;
  const restLeft = a?.restUntil ? (a.restUntil - now) / 1000 : 0;
  useEffect(() => {
    if (a?.restUntil && a.restUntil <= now && restDone.current !== a.restUntil) {
      restDone.current = a.restUntil;
      haptic.success();
      updateActive((x) => ({ ...x, restUntil: null }));
    }
  }, [now, a?.restUntil]);

  if (!a) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ground, alignItems: 'center', justifyContent: 'center', padding: gutter }}>
        <Txt v="titleSm">{t('no_active')}</Txt>
        <Button label={t('back')} onPress={() => router.replace('/client')} style={{ marginTop: space.xl }} />
      </View>
    );
  }

  const planned = item?.sets ?? 0;
  const allSetsDone = setIdx >= planned;
  const isLast = a.cur >= a.items.length - 1;
  const focus: Muscle[] = e ? [...e.primary, ...e.secondary] : [];
  const levels: Partial<Record<Muscle, number>> = {};
  e?.secondary.forEach((m) => (levels[m] = 2));
  e?.primary.forEach((m) => (levels[m] = 4));

  const commitSet = () => {
    if (!item || r == null || r <= 0) return;
    const isPR = best && e1rm(w, r) > best.e1rm + 0.01;
    logSet(w, r);
    if (isPR) { haptic.success(); toast(t('pr_live'), 'trophy'); } else haptic.set();
  };

  const next = () => {
    if (isLast) return finish();
    updateActive((x) => ({ ...x, cur: x.cur + 1, restUntil: null }));
  };

  const finish = () => {
    const id = finishWorkout();
    if (id) router.replace({ pathname: '/client/done', params: { id } });
    else router.replace('/client');
  };

  const addExercise = () => {
    setListOpen(false);
    openPicker({
      onPick: (id) => updateActive((x) => ({ ...x, items: [...x.items, { ex: id, sets: 3, reps: '10', rest: 90, note: '' }], cur: x.items.length })),
    });
  };
  const replace = (i: number) => {
    setListOpen(false);
    const cur = exercise(a.items[i].ex);
    openPicker({
      muscle: cur?.primary[0] ?? null,
      onPick: (id) => updateActive((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, ex: id } : it)), cur: i })),
    });
  };

  const mainLabel = !item
    ? t('add_exercise')
    : !allSetsDone ? t('set_done', { n: setIdx + 1 })
    : isLast ? t('finish_workout') : t('next_exercise');

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      {/* Top bar */}
      <View style={{ paddingTop: ins.top + space.sm, paddingHorizontal: gutter, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconButton name="close" label={t('close')} onPress={() => setExitOpen(true)} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt v="number">{duration(now - a.startedAt)}</Txt>
          <Txt v="small" c={C.ink3} numberOfLines={1}>{a.dayName}</Txt>
        </View>
        <IconButton name="list" label={t('exercises')} onPress={() => setListOpen(true)} />
      </View>

      {/* Progress segments */}
      <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: gutter, marginTop: space.md }}>
        {a.items.map((it, i) => {
          const d = a.sets.filter((s) => s.order === i).length;
          const f = Math.min(1, d / it.sets);
          return (
            <Tap key={i} feedback="selection" onPress={() => updateActive((x) => ({ ...x, cur: i, restUntil: null }))} hitSlop={{ top: 10, bottom: 10 }}
              style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i === a.cur ? C.ink3 : C.surface3, overflow: 'hidden' }}>
              <View style={{ width: `${f * 100}%`, height: 6, backgroundColor: i === a.cur ? C.ember : C.emberText, opacity: i === a.cur ? 1 : 0.6 }} />
            </Tap>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: gutter, paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
        {item ? (
          <Animated.View key={`${a.cur}-${item.ex}`} entering={FadeIn.duration(260)}>
            <View style={{ flexDirection: 'row', gap: space.lg }}>
              <View style={{ flex: 1 }}>
                <Txt v="micro" c={C.ink3}>{t('ex_of', { n: a.cur + 1, total: a.items.length })}</Txt>
                <Txt v="title" style={{ marginTop: 6 }}>{exName(item.ex)}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md }}>
                  {e?.primary.map((m) => <Tag key={m} tone="ember" label={muscle(m)} />)}
                  {e?.secondary.slice(0, 2).map((m) => <Tag key={m} label={muscle(m)} />)}
                </View>
                <Txt v="small" c={C.ink2} style={{ marginTop: space.md }}>
                  {t('plan_line', { sets: item.sets, reps: item.reps, rest: item.rest })}
                </Txt>
                {item.note ? <Txt v="small" c={C.goldText} style={{ marginTop: 4 }}>“{item.note}”</Txt> : null}
              </View>
              {e ? <BodyMap view={viewOf(e.primary[0])} levels={levels} focus={focus} width={78} /> : null}
            </View>

            {/* Sets */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space.xl }}>
              {Array.from({ length: Math.max(planned, setIdx + (allSetsDone ? 0 : 1)) }, (_, i) => {
                const s = doneHere[i];
                const cur = i === setIdx;
                return (
                  <View key={i} style={{ minWidth: 72, paddingHorizontal: 12, height: 52, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: s ? C.emberTint : C.surface, borderWidth: cur ? 2 : 0, borderColor: C.ember }}>
                    {s ? (
                      <>
                        <Txt v="smallMd" c={C.emberText}>{s.w != null ? `${kg(s.w)}×${s.r}` : `×${s.r}`}</Txt>
                        <Icon name="check" size={12} color={C.emberText} stroke={3} />
                      </>
                    ) : (
                      <Txt v="smallMd" c={cur ? C.ink : C.ink3}>{t('set_n', { n: i + 1 })}</Txt>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Previous performance */}
            <View style={{ marginTop: space.lg, backgroundColor: C.surface, borderRadius: radius.tile, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Icon name="undo" size={18} color={C.ink3} />
              <Txt v="small" c={C.ink2} style={{ flex: 1 }}>
                {prev.length ? `${t('last_time')}: ${prev.map((s) => (s.w != null ? `${kg(s.w)}×${s.r}` : `×${s.r}`)).join(' · ')}` : t('first_time')}
              </Txt>
              {best ? <Tag tone="gold" icon="trophy" label={`${kg(best.w)}×${best.r}`} /> : null}
            </View>

            {/* Steppers */}
            {!allSetsDone ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: space.lg }}>
                <Stepper label={t('weight')} unit={bodyweight && w == null ? t('bodyweight') : t('kg')} value={w} onChange={setW} step={2.5} max={500} />
                <Stepper label={t('reps')} value={r} onChange={setR} step={1} min={1} max={100} decimals={0} />
              </View>
            ) : (
              <Animated.View entering={FadeInUp} style={{ marginTop: space.lg, backgroundColor: C.mintTint, borderRadius: radius.tile, padding: space.lg, gap: 4 }}>
                <Txt v="bodyStrong" c={C.mintText}>{t('ex_complete')}</Txt>
                {!isLast ? <Txt v="small" c={C.ink2}>{t('up_next', { name: exName(a.items[a.cur + 1].ex) })}</Txt> : <Txt v="small" c={C.ink2}>{t('last_one')}</Txt>}
                <Tap onPress={() => updateActive((x) => ({ ...x, items: x.items.map((it, j) => (j === x.cur ? { ...it, sets: it.sets + 1 } : it)) }))} style={{ marginTop: space.sm }}>
                  <Txt v="smallMd" c={C.emberText}>+ {t('one_more_set')}</Txt>
                </Tap>
              </Animated.View>
            )}
            {setIdx > 0 ? (
              <Tap onPress={undoLastSet} feedback="selection" style={{ alignSelf: 'center', marginTop: space.lg, flexDirection: 'row', gap: 6, alignItems: 'center', padding: 8 }}>
                <Icon name="undo" size={16} color={C.ink3} />
                <Txt v="smallMd" c={C.ink3}>{t('undo_set')}</Txt>
              </Tap>
            ) : null}
          </Animated.View>
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: space.md }}>
            <Txt v="titleSm" style={{ textAlign: 'center' }}>{t('free_title')}</Txt>
            <Txt v="small" c={C.ink2} style={{ textAlign: 'center' }}>{t('free_sub')}</Txt>
          </View>
        )}
      </ScrollView>

      {/* Bottom action */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: gutter, paddingBottom: ins.bottom + space.lg, backgroundColor: C.ground, borderTopWidth: 1, borderTopColor: C.line }}>
        <Button big label={mainLabel} icon={!item ? 'plus' : !allSetsDone ? 'check' : isLast ? 'trophy' : 'right'}
          onPress={!item ? addExercise : !allSetsDone ? commitSet : next} feedback="none" disabled={!!item && !allSetsDone && (r == null || r <= 0)} />
      </View>

      {/* Rest overlay */}
      {resting ? (
        <Animated.View entering={SlideInDown.springify().damping(20)} exiting={SlideOutDown.duration(200)}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
            padding: gutter, paddingBottom: ins.bottom + space.xl, alignItems: 'center', gap: space.lg, borderTopWidth: 1, borderColor: C.line }}>
          <Txt v="micro" c={C.ink3}>{t('rest')}</Txt>
          <Ring size={180} stroke={12} value={restLeft / Math.max(1, a.restTotal)} tint={C.mint} duration={250}>
            <Txt v="hero" style={{ fontSize: 44, lineHeight: 50 }}>{clock(restLeft)}</Txt>
          </Ring>
          <Txt v="small" c={C.ink2}>
            {!allSetsDone ? t('next_set', { n: setIdx + 1 }) : !isLast ? t('up_next', { name: exName(a.items[a.cur + 1].ex) }) : t('last_one')}
          </Txt>
          <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
            <Button kind="secondary" label="−15" style={{ flex: 1 }} feedback="selection" onPress={() => updateActive((x) => ({ ...x, restUntil: (x.restUntil ?? Date.now()) - 15000 }))} />
            <Button kind="secondary" label="+15" style={{ flex: 1 }} feedback="selection" onPress={() => updateActive((x) => ({ ...x, restUntil: (x.restUntil ?? Date.now()) + 15000, restTotal: x.restTotal + 15 }))} />
            <Button kind="mint" label={t('skip')} style={{ flex: 1.3 }} onPress={() => updateActive((x) => ({ ...x, restUntil: null }))} />
          </View>
        </Animated.View>
      ) : null}

      {/* Exercise list */}
      <Sheet open={listOpen} onClose={() => setListOpen(false)} title={t('exercises')}>
        <View style={{ gap: 8 }}>
          {a.items.map((it, i) => {
            const d = a.sets.filter((s) => s.order === i).length;
            const done = d >= it.sets;
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: i === a.cur ? C.surface3 : C.surface2, borderRadius: radius.tile, paddingLeft: 14, paddingRight: 6, minHeight: 60 }}>
                <Tap style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}
                  onPress={() => { updateActive((x) => ({ ...x, cur: i, restUntil: null })); setListOpen(false); }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: done ? C.ember : C.surface, alignItems: 'center', justifyContent: 'center' }}>
                    {done ? <Icon name="check" size={14} color={C.onEmber} stroke={3} /> : <Txt v="smallMd" c={C.ink2}>{i + 1}</Txt>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt v="bodyMd" numberOfLines={1}>{exName(it.ex)}</Txt>
                    <Txt v="small" c={C.ink3}>{d}/{it.sets} · {it.reps}</Txt>
                  </View>
                </Tap>
                {d === 0 ? <IconButton name="swap" label={t('replace')} onPress={() => replace(i)} bg="transparent" tint={C.ink2} size={44} /> : null}
                {d === 0 && a.items.length > 1 ? (
                  <IconButton name="trash" label={t('remove')} bg="transparent" tint={C.ink3} size={44}
                    onPress={() => updateActive((x) => ({ ...x, items: x.items.filter((_, j) => j !== i), cur: Math.max(0, Math.min(x.cur > i ? x.cur - 1 : x.cur, x.items.length - 2)),
                      sets: x.sets.map((s) => (s.order > i ? { ...s, order: s.order - 1 } : s)) }))} />
                ) : null}
              </View>
            );
          })}
          <Button kind="ghost" icon="plus" label={t('add_exercise')} onPress={addExercise} style={{ marginTop: 6 }} />
        </View>
      </Sheet>

      {/* Exit */}
      <Sheet open={exitOpen} onClose={() => setExitOpen(false)} title={t('exit_title')}>
        <View style={{ gap: 10 }}>
          {a.sets.length > 0 ? <Button big icon="trophy" label={t('finish_save')} onPress={() => { setExitOpen(false); finish(); }} /> : null}
          <Button kind="secondary" icon="pause" label={t('continue_later')} onPress={() => { setExitOpen(false); router.replace('/client'); }} />
          <Button kind="danger" icon="trash" label={t('discard')} onPress={() => { setExitOpen(false); discardWorkout(); router.replace('/client'); }} />
        </View>
      </Sheet>
    </View>
  );
}
