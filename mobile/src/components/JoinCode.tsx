// Shows a client's join code big, with share-to-WhatsApp and copy.
import * as Clipboard from 'expo-clipboard';
import { View } from 'react-native';
import { useCoach, type Client } from '@/data/coach';
import { useT } from '@/i18n';
import { whatsapp } from '@/lib/links';
import { msg } from '@/lib/messages';
import { color as C, font, radius, space } from '@/theme/tokens';
import { toast } from './Toast';
import { Button, Txt } from './ui';

export function JoinCode({ client }: { client: Client }) {
  const { t } = useT();
  const coach = useCoach((s) => s.coach);
  const text = msg.invite(client.lang, client.name, client.join_code, coach?.name ?? '');
  return (
    <View style={{ gap: space.lg }}>
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
        {client.join_code.split('').map((ch, i) => (
          <View key={i} style={{ width: 46, height: 60, borderRadius: radius.control, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Txt v="numberLg" style={{ fontFamily: font.display }}>{ch}</Txt>
          </View>
        ))}
      </View>
      <Txt v="small" c={C.ink2} style={{ textAlign: 'center' }}>{t('code_hint')}</Txt>
      <Button big kind="mint" icon="chat" label={t('send_whatsapp')} onPress={() => whatsapp(client.phone, text)} />
      <Button kind="secondary" icon="copy" label={t('copy_invite')} onPress={async () => { await Clipboard.setStringAsync(text); toast(t('copied')); }} />
    </View>
  );
}
