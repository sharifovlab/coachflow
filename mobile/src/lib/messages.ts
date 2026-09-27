// WhatsApp message templates, written in the recipient's language.
import { translate } from '@/i18n';
import { money } from '@/features/format';
import { WEB_URL } from '@/data/supabase';

type L = 'az' | 'ru';
export const msg = {
  pay: (lang: L, name: string, price: number, card: string) => translate(lang, 'wa_pay', { name: name.split(' ')[0], sum: money(price), card: card || '—' }),
  lead: (lang: L, name: string, coach: string) => translate(lang, 'wa_lead', { name: name.split(' ')[0], coach }),
  report: (lang: L, name: string) => translate(lang, 'wa_report', { name: name.split(' ')[0] }),
  pr: (lang: L, name: string, ex: string, w: string) => translate(lang, 'wa_pr', { name: name.split(' ')[0], ex, w }),
  silent: (lang: L, name: string) => translate(lang, 'wa_silent', { name: name.split(' ')[0] }),
  invite: (lang: L, name: string, code: string, coach: string) => translate(lang, 'wa_invite', { name: name.split(' ')[0], code, coach, link: `${WEB_URL}/app` }),
};
