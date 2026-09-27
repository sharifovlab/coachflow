// Coach · Programs — every program shows which muscles it covers in a week, so gaps are obvious.
import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { BodyPair } from '@/components/BodyMap';
import { Icon } from '@/components/Icon';
import { Button, Empty, Tap, Txt, Screen } from '@/components/ui';
import { useCoach } from '@/data/coach';
import { programCoverage } from '@/features/load';
import { useT } from '@/i18n';
import { color as C, radius, space } from '@/theme/tokens';

export default function Programs() {
  const { t } = useT();
  const programs = useCoach((s) => s.programs);
  const clients = useCoach((s) => s.clients);
  const cov = useMemo(() => new Map(programs.map((p) => [p.id, programCoverage(p.days)])), [programs]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt v="title">{t('tab_programs')}</Txt>
        <Button label={t('new')} icon="plus" onPress={() => router.push({ pathname: '/coach/program/[id]', params: { id: 'new' } })} />
      </View>
      {programs.length === 0 ? <Empty icon="clipboard" title={t('no_programs')} text={t('no_programs_sub')} /> : null}
      <View style={{ gap: 10, marginTop: space.xl }}>
        {programs.map((p) => {
          const n = clients.filter((c) => c.program_id === p.id).length;
          const exCount = p.days.reduce((a, d) => a + d.items.length, 0);
          return (
            <Tap key={p.id} onPress={() => router.push({ pathname: '/coach/program/[id]', params: { id: p.id } })} scaleTo={0.98}
              style={{ backgroundColor: C.surface, borderRadius: radius.card, padding: space.lg, flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
              <BodyPair levels={cov.get(p.id)!.levels} width={96} gap={4} />
              <View style={{ flex: 1, gap: 6 }}>
                <Txt v="lead" numberOfLines={2}>{p.name}</Txt>
                <Txt v="small" c={C.ink2}>{t('days_n', { n: p.days.length })} · {t('exercises_n', { n: exCount })}</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="users" size={16} color={C.ink3} />
                  <Txt v="small" c={C.ink3}>{t('clients_n', { n })}</Txt>
                </View>
              </View>
              <Icon name="right" color={C.ink3} />
            </Tap>
          );
        })}
      </View>
    </Screen>
  );
}
