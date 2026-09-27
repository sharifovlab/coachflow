// Coach · Program builder — build days of exercises and watch weekly muscle coverage light up. Tap a cold muscle to fill it.
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BodyMap } from '@/components/BodyMap';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { toast } from '@/components/Toast';
import { Button, Chip, IconButton, Tag, Tap, Txt } from '@/components/ui';
import { deleteProgram, saveProgram, useCoach } from '@/data/coach';
import { openPicker } from '@/data/picker';
import { uuid } from '@/data/supabase';
import { exercise } from '@/features/exercises';
import { kg } from '@/features/format';
import { programCoverage } from '@/features/load';
import { MUSCLES, type Muscle } from '@/features/muscles';
import { estimateMinutes } from '@/features/program';
import type { PlanItem, ProgramDay } from '@/features/types';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { color as C, font, gutter, radius, space } from '@/theme/tokens';

const RESTS = [45, 60, 90, 120, 180];

export default function ProgramBuilder() {
  const { t, muscle, ex } = useT();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const existing = useCoach((s) => s.programs.find((p) => p.id === id));
  const users = useCoach((s) => s.clients.filter((c) => c.program_id === id).length);
  const [name, setName] = useState(existing?.name ?? '');
  const [days, setDays] = useState<ProgramDay[]>(existing?.days.length ? existing.days : [{ id: uuid().slice(0, 8), name: '', items: [] }]);
  const [cur, setCur] = useState(0);
  const [openItem, setOpenItem] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [view, setView] = useState<'front' | 'back'>('front');

  const cov = useMemo(() => programCoverage(days), [days]);
  const day = days[cur];
  const cold = MUSCLES.filter((m) => cov.levels[m] <= 1);

  const edit = (fn: (d: ProgramDay[]) => ProgramDay[]) => { setDays(fn); setDirty(true); };
  const editDay = (fn: (d: ProgramDay) => ProgramDay) => edit((ds) => ds.map((d, i) => (i === cur ? fn(d) : d)));
  const editItem = (i: number, patch: Partial<PlanItem>) => editDay((d) => ({ ...d, items: d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));

  const add = (m?: Muscle) => openPicker({
    muscle: m ?? null,
    onPick: (exId) => { editDay((d) => ({ ...d, items: [...d.items, { ex: exId, sets: 3, reps: '8-12', rest: 90, note: '' }] })); haptic.tap(); },
  });
  const move = (i: number, dir: -1 | 1) => editDay((d) => {
    const items = [...d.items];
    const j = i + dir;
    if (j < 0 || j >= items.length) return d;
    [items[i], items[j]] = [items[j], items[i]];
    return { ...d, items };
  });

  const save = async () => {
    setBusy(true);
    const clean = days.filter((d) => d.items.length > 0).map((d, i) => ({ ...d, name: d.name.trim() || t('day_n', { n: i + 1 }) }));
    const r = await saveProgram({ id: existing?.id, name: name.trim() || t('new_program'), days: clean });
    setBusy(false);
    if (!r) { toast(t('err_network'), 'close'); return; }
    haptic.success();
    toast(t('saved'));
    setDirty(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: C.ground }}>
      <View style={{ paddingTop: ins.top + space.sm, paddingHorizontal: gutter, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconButton name="left" label={t('back')} onPress={() => router.back()} />
        <TextInput value={name} onChangeText={(v) => { setName(v); setDirty(true); }} placeholder={t('program_name')} placeholderTextColor={C.ink3}
          style={{ flex: 1, color: C.ink, fontFamily: font.displayMedium, fontSize: 20 }} />
        {existing ? <IconButton name="trash" label={t('delete')} tint={C.ink3} onPress={() => setConfirmDel(true)} /> : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: gutter, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        {/* Coverage */}
        <View style={{ backgroundColor: C.surface, borderRadius: radius.card, padding: space.lg, flexDirection: 'row', gap: space.lg }}>
          <Tap onPress={() => setView(view === 'front' ? 'back' : 'front')} feedback="selection" scaleTo={0.96}>
            <BodyMap view={view} levels={cov.levels} width={Math.min(110, width * 0.28)} onPressMuscle={(m) => add(m)} />
          </Tap>
          <View style={{ flex: 1, gap: 8 }}>
            <Txt v="micro" c={C.ink3}>{t('weekly_coverage')}</Txt>
            <Txt v="small" c={C.ink2}>{t('coverage_hint')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {cold.slice(0, 6).map((m) => (
                <Tap key={m} onPress={() => add(m)} feedback="selection"><Tag label={`+ ${muscle(m)}`} /></Tap>
              ))}
              {cold.length === 0 ? <Tag tone="mint" icon="check" label={t('full_body_covered')} /> : null}
            </View>
          </View>
        </View>

        {/* Days */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.xl, marginHorizontal: -gutter }} contentContainerStyle={{ paddingHorizontal: gutter, gap: 8 }}>
          {days.map((d, i) => (
            <Chip key={d.id} label={d.name.trim() || t('day_n', { n: i + 1 })} active={i === cur} onPress={() => { setCur(i); setOpenItem(null); }} />
          ))}
          <Chip label={t('add_day')} icon="plus" onPress={() => { edit((ds) => [...ds, { id: uuid().slice(0, 8), name: '', items: [] }]); setCur(days.length); }} />
        </ScrollView>

        {day ? (
          <Animated.View key={day.id} entering={FadeIn.duration(200)} style={{ marginTop: space.lg, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <TextInput value={day.name} onChangeText={(v) => editDay((d) => ({ ...d, name: v }))} placeholder={t('day_name_ph', { n: cur + 1 })} placeholderTextColor={C.ink3}
                style={{ flex: 1, minHeight: 48, color: C.ink, fontFamily: font.bodySemi, fontSize: 17, backgroundColor: C.surface2, borderRadius: radius.control, paddingHorizontal: 14 }} />
              {days.length > 1 ? <IconButton name="trash" label={t('delete_day')} tint={C.ink3} onPress={() => { edit((ds) => ds.filter((_, i) => i !== cur)); setCur(Math.max(0, cur - 1)); }} /> : null}
            </View>
            <Txt v="small" c={C.ink3}>{t('exercises_n', { n: day.items.length })} · ~{estimateMinutes(day.items)} {t('min')}</Txt>

            {day.items.map((it, i) => {
              const e = exercise(it.ex);
              const isOpen = openItem === i;
              return (
                <Animated.View key={`${it.ex}-${i}`} layout={LinearTransition.duration(200)} style={{ backgroundColor: C.surface, borderRadius: radius.tile, overflow: 'hidden' }}>
                  <Tap onPress={() => setOpenItem(isOpen ? null : i)} feedback="selection" scaleTo={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: 14 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.surface3, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt v="smallMd" c={C.ink2}>{i + 1}</Txt>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt v="bodyStrong" numberOfLines={1}>{ex(it.ex)}</Txt>
                      <Txt v="small" c={C.ink3} numberOfLines={1}>
                        {it.sets}×{it.reps} · {it.rest}s{e ? ` · ${e.primary.map(muscle).join(', ')}` : ''}
                      </Txt>
                    </View>
                    <Icon name={isOpen ? 'up' : 'down'} size={20} color={C.ink3} />
                  </Tap>
                  {isOpen ? (
                    <Animated.View entering={FadeIn.duration(180)} style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 12 }}>
                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        <Txt v="small" c={C.ink2} style={{ width: 70 }}>{t('sets')}</Txt>
                        <IconButton name="minus" label="−" size={40} onPress={() => editItem(i, { sets: Math.max(1, it.sets - 1) })} />
                        <Txt v="number" style={{ minWidth: 28, textAlign: 'center' }}>{it.sets}</Txt>
                        <IconButton name="plus" label="+" size={40} onPress={() => editItem(i, { sets: Math.min(20, it.sets + 1) })} />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Txt v="small" c={C.ink2} style={{ width: 70 }}>{t('reps')}</Txt>
                        {['5', '8', '8-12', '10', '12-15', '15'].map((r) => <Chip key={r} label={r} active={it.reps === r} onPress={() => editItem(i, { reps: r })} />)}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Txt v="small" c={C.ink2} style={{ width: 70 }}>{t('rest')}</Txt>
                        {RESTS.map((r) => <Chip key={r} label={`${r}s`} active={it.rest === r} onPress={() => editItem(i, { rest: r })} />)}
                      </View>
                      <TextInput value={it.note} onChangeText={(v) => editItem(i, { note: v })} placeholder={t('coach_note_ph')} placeholderTextColor={C.ink3}
                        style={{ minHeight: 44, color: C.ink, fontFamily: font.body, fontSize: 15, backgroundColor: C.surface2, borderRadius: radius.control, paddingHorizontal: 12 }} />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <IconButton name="up" label={t('move_up')} onPress={() => { move(i, -1); setOpenItem(i - 1 >= 0 ? i - 1 : i); }} disabled={i === 0} />
                        <IconButton name="down" label={t('move_down')} onPress={() => { move(i, 1); setOpenItem(i + 1 < day.items.length ? i + 1 : i); }} disabled={i === day.items.length - 1} />
                        <IconButton name="swap" label={t('replace')} onPress={() => openPicker({ muscle: e?.primary[0] ?? null, onPick: (x) => editItem(i, { ex: x }) })} />
                        <View style={{ flex: 1 }} />
                        <IconButton name="trash" label={t('remove')} tint={C.danger} bg={C.dangerTint} onPress={() => { editDay((d) => ({ ...d, items: d.items.filter((_, j) => j !== i) })); setOpenItem(null); }} />
                      </View>
                    </Animated.View>
                  ) : null}
                </Animated.View>
              );
            })}
            <Button kind="ghost" icon="plus" label={t('add_exercise')} onPress={() => add()} style={{ marginTop: 4 }} />
          </Animated.View>
        ) : null}
        {users ? <Txt v="small" c={C.ink3} style={{ marginTop: space.xl, textAlign: 'center' }}>{t('program_used_by', { n: users })}</Txt> : null}
        <Txt v="small" c={C.ink3} style={{ marginTop: 4, textAlign: 'center' }}>{t('coverage_note', { n: kg(10, 0) })}</Txt>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: gutter, paddingBottom: ins.bottom + space.lg, backgroundColor: C.ground }}>
        <Button big label={t('save')} icon="check" onPress={save} loading={busy} disabled={!dirty && !!existing} />
      </View>
      <Sheet open={confirmDel} onClose={() => setConfirmDel(false)} title={t('delete_program')}>
        <Txt v="body" c={C.ink2}>{users ? t('delete_program_used', { n: users }) : t('delete_program_text')}</Txt>
        <View style={{ gap: 10, marginTop: space.xl }}>
          <Button kind="danger" icon="trash" label={t('delete')} onPress={async () => { await deleteProgram(existing!.id); setConfirmDel(false); router.back(); }} />
          <Button kind="secondary" label={t('cancel')} onPress={() => setConfirmDel(false)} />
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}
