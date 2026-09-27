// Weekly check-in sheet: weight, a note and an optional progress photo for the coach.
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, TextInput, View } from 'react-native';
import { submitReport, useClientData } from '@/data/client';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { color as C, font, radius, space } from '@/theme/tokens';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';
import { toast } from './Toast';
import { Button, Tap, Txt } from './ui';
import { Icon } from './Icon';

export function ReportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const { view } = useClientData();
  const last = [...(view?.weights ?? [])].reverse().find((w) => w.kg != null)?.kg ?? null;
  const [w, setW] = useState<number | null>(last);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; mime?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setW(last ?? 70); setNote(''); setPhoto(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, allowsEditing: true, aspect: [3, 4] });
    if (!r.canceled && r.assets[0]) setPhoto({ uri: r.assets[0].uri, mime: r.assets[0].mimeType ?? 'image/jpeg' });
  };

  const send = async () => {
    setBusy(true);
    const r = await submitReport(w, note.trim(), photo);
    setBusy(false);
    if (r === 'error') { haptic.warning(); toast(t('err_network'), 'close'); return; }
    haptic.success();
    toast(r === 'photo' ? t('report_photo_fail') : t('report_sent'));
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('report_title')}>
      <Txt v="small" c={C.ink2} style={{ marginBottom: space.lg }}>{t('report_sub')}</Txt>
      <Stepper label={t('weight')} unit={t('kg')} value={w} onChange={setW} step={0.1} min={20} max={400} />
      <TextInput
        value={note} onChangeText={setNote} placeholder={t('report_note_ph')} placeholderTextColor={C.ink3} multiline maxLength={1000}
        style={{ marginTop: space.md, minHeight: 88, borderRadius: radius.tile, backgroundColor: C.surface2, color: C.ink, padding: 16, fontFamily: font.body, fontSize: 15, textAlignVertical: 'top' }}
      />
      <Tap onPress={pick} style={{ marginTop: space.md, borderRadius: radius.tile, backgroundColor: C.surface2, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {photo ? <Image source={{ uri: photo.uri }} style={{ width: 48, height: 64, borderRadius: 10 }} /> : (
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.surface3, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="camera" size={22} color={C.ink2} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Txt v="bodyMd">{photo ? t('report_photo_change') : t('report_photo')}</Txt>
          <Txt v="small" c={C.ink3}>{t('report_photo_private')}</Txt>
        </View>
      </Tap>
      <Button big label={t('report_send')} onPress={send} loading={busy} style={{ marginTop: space.xl }} />
    </Sheet>
  );
}
