// Exercise picker: tap a muscle on the body (or search) to find the right exercise fast.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BodyMap } from '@/components/BodyMap';
import { Icon } from '@/components/Icon';
import { Segmented } from '@/components/Segmented';
import { Chip, IconButton, Tap, Txt } from '@/components/ui';
import { completePick, pickerRequest } from '@/data/picker';
import { EXERCISES, exercisesFor, type Exercise } from '@/features/exercises';
import { viewOf, type Muscle } from '@/features/muscles';
import { useT } from '@/i18n';
import { color as C, font, gutter, radius, space } from '@/theme/tokens';

const EQUIP = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell'] as const;

export default function ExercisePicker() {
  const { t, lang, muscle } = useT();
  const ins = useSafeAreaInsets();
  const req = pickerRequest();
  const [m, setM] = useState<Muscle | null>(req?.muscle ?? null);
  const [view, setView] = useState<'front' | 'back'>(req?.muscle ? viewOf(req.muscle) : 'front');
  const [q, setQ] = useState('');
  const [eq, setEq] = useState<string | null>(null);

  const list = useMemo(() => {
    let l: Exercise[] = m ? exercisesFor(m) : EXERCISES;
    const s = q.trim().toLowerCase();
    if (s) l = l.filter((e) => [e.ru, e.az, e.en].some((x) => x.toLowerCase().includes(s)));
    if (eq) l = l.filter((e) => e.equipment === eq);
    return l;
  }, [m, q, eq]);

  const pick = (id: string) => {
    completePick(id);
    router.back();
  };

  const levels = m ? { [m]: 4 } : {};

  return (
    <View style={{ flex: 1, backgroundColor: C.ground, paddingTop: ins.top + space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: gutter }}>
        <IconButton name="close" label={t('close')} onPress={() => router.back()} />
        <Txt v="titleSm" style={{ flex: 1 }}>{t('pick_title')}</Txt>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: gutter, marginTop: space.md, gap: space.lg, alignItems: 'center' }}>
        <BodyMap view={view} levels={levels} width={96} selected={m} onPressMuscle={(x) => setM(x === m ? null : x)} />
        <View style={{ flex: 1, gap: space.md }}>
          <Segmented small value={view} onChange={setView} options={[{ key: 'front', label: t('front') }, { key: 'back', label: t('back_view') }]} />
          <Txt v="small" c={C.ink2}>{m ? t('pick_for', { m: muscle(m) }) : t('pick_hint')}</Txt>
          {m ? <Chip label={t('all_muscles')} icon="close" onPress={() => setM(null)} /> : null}
        </View>
      </View>

      <View style={{ paddingHorizontal: gutter, marginTop: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface2, borderRadius: radius.pill, paddingHorizontal: 16, height: 48 }}>
          <Icon name="search" size={20} color={C.ink3} />
          <TextInput value={q} onChangeText={setQ} placeholder={t('search')} placeholderTextColor={C.ink3}
            style={{ flex: 1, color: C.ink, fontFamily: font.body, fontSize: 16 }} />
        </View>
      </View>
      <FlatList
        horizontal data={EQUIP as readonly string[]} keyExtractor={(x) => x} showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 44, marginTop: space.md }} contentContainerStyle={{ paddingHorizontal: gutter, gap: 8, alignItems: 'center' }}
        renderItem={({ item }) => <Chip label={t(`eq_${item}` as any)} active={eq === item} onPress={() => setEq(eq === item ? null : item)} />}
      />

      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: gutter, paddingBottom: ins.bottom + 40, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={q.trim() && req?.allowCustom !== false ? (
          <Tap onPress={() => pick(`custom:${q.trim().slice(0, 50)}`)} style={{ padding: space.lg, borderRadius: radius.tile, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icon name="plus" color={C.ink2} />
            <Txt v="bodyMd" c={C.ink2} style={{ flex: 1 }}>{t('pick_custom', { q: q.trim() })}</Txt>
          </Tap>
        ) : null}
        renderItem={({ item }) => (
          <Tap onPress={() => pick(item.id)} style={{ backgroundColor: C.surface, borderRadius: radius.tile, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt v="bodyStrong">{item[lang]}</Txt>
              <Txt v="small" c={C.ink3} numberOfLines={1}>
                <Txt v="small" c={C.emberText}>{item.primary.map(muscle).join(', ')}</Txt>
                {item.secondary.length ? ` · ${item.secondary.map(muscle).join(', ')}` : ''}
              </Txt>
            </View>
            <Txt v="small" c={C.ink3}>{t(`eq_${item.equipment}` as any)}</Txt>
          </Tap>
        )}
      />
    </View>
  );
}
