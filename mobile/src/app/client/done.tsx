// Client · Done — the reward: the body heats up with today's work, records get celebrated, the coach gets a feel rating.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BodyPair } from '@/components/BodyMap';
import { Icon } from '@/components/Icon';
import { Button, Tag, Tap, Txt } from '@/components/ui';
import { setFeel, useClientData, useClientStatus } from '@/data/client';
import { duration, kg, thousands } from '@/features/format';
import { creditsFromSets, levelsOf, TODAY_TARGET, topMuscles } from '@/features/load';
import { detectPRs, volume } from '@/features/prs';
import { weeklyGoal, weeklyStreak } from '@/features/streak';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { color as C, gutter, radius, space } from '@/theme/tokens';

export default function Done() {
  const { t, muscle, ex } = useT();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useClientData();
  const status = useClientStatus();
  const session = data.sessions.find((s) => s.id === id);
  const [feel, setF] = useState<number | null>(session?.feel ?? null);

  const calc = useMemo(() => {
    const sets = data.sets.filter((s) => s.sid === id);
    const credits = creditsFromSets(sets);
    const goal = weeklyGoal(data.view?.program?.days.length ?? 0);
    return {
      sets,
      levels: levelsOf(credits, TODAY_TARGET),
      top: topMuscles(credits, 3),
      prs: detectPRs(sets, data.sets),
      vol: volume(sets),
      streak: weeklyStreak(data.sessions, goal, Date.now()),
    };
  }, [data, id]);

  useEffect(() => {
    const tmr = setTimeout(() => (calc.prs.length ? haptic.success() : haptic.heavy()), 700);
    return () => clearTimeout(tmr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const synced = !data.pendingIds.has(id ?? '');
  const FEELS = [t('feel_1'), t('feel_2'), t('feel_3'), t('feel_4'), t('feel_5')];

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <ScrollView contentContainerStyle={{ paddingTop: ins.top + space.xl, paddingHorizontal: gutter, paddingBottom: ins.bottom + 120 }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <Txt v="micro" c={C.emberText}>{session?.dayName}</Txt>
          <Txt v="hero" style={{ marginTop: 6 }}>{calc.prs.length ? t('done_pr_title') : t('done_title')}</Txt>
        </Animated.View>

        <View style={{ alignItems: 'center', marginTop: space.xl }}>
          <BodyPair levels={calc.levels} width={Math.min(width - gutter * 2, 340)} gap={14} stagger={70} startDelay={350} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: space.md }}>
          {calc.top.map((m) => <Tag key={m} tone="ember" label={muscle(m)} />)}
        </View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)} style={{ flexDirection: 'row', gap: 10, marginTop: space.xl }}>
          {[
            { k: t('time'), v: session?.finishedAt ? duration(session.finishedAt - session.startedAt) : '—' },
            { k: t('sets'), v: String(calc.sets.length) },
            { k: t('volume'), v: calc.vol >= 1000 ? `${kg(calc.vol / 1000)} ${t('t')}` : `${thousands(calc.vol)} ${t('kg')}` },
          ].map((x) => (
            <View key={x.k} style={{ flex: 1, backgroundColor: C.surface, borderRadius: radius.tile, padding: 14, gap: 4 }}>
              <Txt v="micro" c={C.ink3}>{x.k}</Txt>
              <Txt v="number">{x.v}</Txt>
            </View>
          ))}
        </Animated.View>

        {/* PRs */}
        {calc.prs.map((p, i) => (
          <Animated.View key={p.ex} entering={ZoomIn.delay(900 + i * 150).springify()}
            style={{ marginTop: space.md, backgroundColor: C.goldTint, borderRadius: radius.tile, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderColor: C.gold + '44' }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trophy" color="#1F1500" />
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="micro" c={C.goldText}>{t('new_record')}</Txt>
              <Txt v="bodyStrong">{ex(p.ex)}</Txt>
              <Txt v="small" c={C.ink2}>{kg(p.w)} {t('kg')} × {p.r} · {t('was')} {kg(p.prev.w)}×{p.prev.r}</Txt>
            </View>
          </Animated.View>
        ))}

        {/* Streak */}
        <Animated.View entering={FadeInDown.delay(800).duration(400)}
          style={{ marginTop: space.md, backgroundColor: C.surface, borderRadius: radius.tile, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Icon name="flame" size={28} color={C.ember} fill={C.ember} />
          <View style={{ flex: 1 }}>
            <Txt v="bodyStrong">{t('streak_title', { n: calc.streak.streak })}</Txt>
            <Txt v="small" c={C.ink2}>{t('streak_week', { n: calc.streak.thisWeek, goal: calc.streak.goal })}</Txt>
          </View>
        </Animated.View>

        {/* Feel */}
        <Txt v="micro" c={C.ink3} style={{ marginTop: space.xxl, marginBottom: space.md }}>{t('how_was_it')}</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {FEELS.map((label, i) => {
            const v = i + 1;
            const on = feel === v;
            return (
              <Tap key={v} feedback="selection" onPress={() => { setF(v); if (id) setFeel(id, v); }} accessibilityLabel={label}
                style={{ flex: 1, height: 72, borderRadius: radius.tile, backgroundColor: on ? C.emberTint : C.surface, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1.5, borderColor: on ? C.ember : 'transparent' }}>
                <Txt v="number" c={on ? C.emberText : C.ink2}>{v}</Txt>
                <Txt v="small" c={on ? C.emberText : C.ink3} style={{ fontSize: 10.5 }} numberOfLines={1}>{label}</Txt>
              </Tap>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space.xl, justifyContent: 'center' }}>
          <Icon name={synced ? 'check' : 'timer'} size={16} color={synced ? C.mintText : C.goldText} />
          <Txt v="small" c={synced ? C.mintText : C.goldText}>{synced ? t('synced') : status.syncing ? t('syncing') : t('saved_offline')}</Txt>
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: gutter, paddingBottom: ins.bottom + space.lg }}>
        <Button big label={t('done')} onPress={() => router.replace('/client')} />
      </View>
    </View>
  );
}
