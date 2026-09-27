// Coach · Clients — find anyone fast and see who needs attention (debt, silence) at a glance.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Avatar, Chip, Empty, Tag, Tap, Txt } from '@/components/ui';
import { loadCoach } from '@/data/coach';
import { useClientRows, type ClientStatus } from '@/data/coachDerived';
import { relDay } from '@/features/format';
import { useT } from '@/i18n';
import { useNow } from '@/lib/useNow';
import { color as C, font, gutter, radius, space } from '@/theme/tokens';

type Filter = 'all' | 'debt' | 'silent' | 'active';

export default function Clients() {
  const { t, lang } = useT();
  const ins = useSafeAreaInsets();
  const now = useNow(60_000);
  const rows = useClientRows(now);
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((r) => !s || r.name.toLowerCase().includes(s) || r.phone.includes(s))
      .filter((r) => f === 'all' || (f === 'debt' && (r.status === 'overdue' || r.status === 'due')) || (f === 'silent' && r.status === 'silent') || (f === 'active' && r.weekCount > 0))
      .sort((a, b) => order(a.status) - order(b.status) || a.name.localeCompare(b.name));
  }, [rows, q, f]);

  const count = (fl: Filter) => rows.filter((r) => (fl === 'debt' ? r.status === 'overdue' || r.status === 'due' : fl === 'silent' ? r.status === 'silent' : r.weekCount > 0)).length;
  const ring: Record<ClientStatus, string> = { overdue: C.danger, due: C.gold, silent: C.ink3, new: C.emberText, active: C.mint };

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        onRefresh={async () => { setRefreshing(true); await loadCoach(); setRefreshing(false); }}
        refreshing={refreshing}
        contentContainerStyle={{ paddingTop: ins.top + space.lg, paddingHorizontal: gutter, paddingBottom: ins.bottom + 180, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ marginBottom: space.md }}>
            <Txt v="title">{t('tab_clients')} <Txt v="title" c={C.ink3}>{rows.length}</Txt></Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface2, borderRadius: radius.pill, paddingHorizontal: 16, height: 50, marginTop: space.lg }}>
              <Icon name="search" size={20} color={C.ink3} />
              <TextInput value={q} onChangeText={setQ} placeholder={t('search_clients')} placeholderTextColor={C.ink3} style={{ flex: 1, color: C.ink, fontFamily: font.body, fontSize: 16 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: space.md, flexWrap: 'wrap' }}>
              <Chip label={t('f_all')} active={f === 'all'} onPress={() => setF('all')} />
              <Chip label={`${t('f_debt')} ${count('debt')}`} active={f === 'debt'} onPress={() => setF('debt')} tone="gold" />
              <Chip label={`${t('f_silent')} ${count('silent')}`} active={f === 'silent'} onPress={() => setF('silent')} />
              <Chip label={`${t('f_active')} ${count('active')}`} active={f === 'active'} onPress={() => setF('active')} tone="mint" />
            </View>
          </View>
        }
        ListEmptyComponent={rows.length === 0 ? (
          <Empty icon="users" title={t('no_clients')} text={t('no_clients_sub')} action={t('add_client')} onAction={() => router.push('/coach/add-client')} />
        ) : <Txt v="small" c={C.ink3}>{t('nothing_found')}</Txt>}
        renderItem={({ item: r }) => (
          <Tap onPress={() => router.push({ pathname: '/coach/client/[id]', params: { id: r.id } })} scaleTo={0.98}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: C.surface, borderRadius: radius.tile, padding: 12, minHeight: 72 }}>
            <View style={{ padding: 2.5, borderRadius: 30, borderWidth: 2.5, borderColor: ring[r.status] }}>
              <Avatar name={r.name} size={42} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="bodyStrong" numberOfLines={1}>{r.name}</Txt>
              <Txt v="small" c={C.ink3} numberOfLines={1}>
                {r.lastAt ? t('last_seen', { when: relDay(r.lastAt, now, lang) }) : t('no_workouts_yet')}
                {r.weekCount ? ` · ${t('week_n', { n: r.weekCount })}` : ''}
              </Txt>
            </View>
            {r.status === 'overdue' ? <Tag tone="danger" label={t('overdue_n', { n: -r.dueIn! })} />
              : r.status === 'due' ? <Tag tone="gold" label={r.dueIn === 0 ? t('pay_today') : t('pay_in', { n: r.dueIn! })} />
              : r.status === 'new' ? <Tag tone="ember" label={t('new')} /> : null}
          </Tap>
        )}
      />
      <Tap onPress={() => router.push('/coach/add-client')} feedback="tap" scaleTo={0.92} accessibilityLabel={t('add_client')}
        style={{ position: 'absolute', right: gutter, bottom: ins.bottom + 100, height: 60, paddingHorizontal: 22, borderRadius: 30, backgroundColor: C.ember,
          flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 8, shadowColor: C.ember, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>
        <Icon name="plus" color={C.onEmber} stroke={2.6} />
        <Txt v="bodyStrong" c={C.onEmber}>{t('client')}</Txt>
      </Tap>
    </View>
  );
}

function order(s: ClientStatus) {
  return { overdue: 0, due: 1, new: 2, silent: 3, active: 4 }[s];
}
