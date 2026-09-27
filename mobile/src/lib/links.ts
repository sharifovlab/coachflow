// Opening WhatsApp, phone, Instagram; sharing text.
import { Linking, Share } from 'react-native';

export function digits(phone: string): string {
  let d = (phone || '').replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 10) d = '994' + d.slice(1); // 050 123 45 67 → 99450...
  if (d.length === 9) d = '994' + d;
  return d;
}

export function whatsapp(phone: string, text = '') {
  const d = digits(phone);
  const url = d ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  return Linking.openURL(url);
}

export function instagram(handle: string) {
  const h = handle.replace(/^@/, '').trim();
  if (h) Linking.openURL(`https://instagram.com/${h}`);
}

export function shareText(message: string) {
  return Share.share({ message }).catch(() => {});
}
