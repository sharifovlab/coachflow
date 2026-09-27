// Number and date formatting for az/ru.
export type Lang = 'az' | 'ru';

export function kg(n: number | null | undefined, digits = 1): string {
  if (n == null) return '—';
  const r = Math.round(n * 10 ** digits) / 10 ** digits;
  return String(r).replace('.', ',');
}

export function money(n: number | null | undefined): string {
  if (n == null) return '—';
  const r = Math.round(n);
  return `${r.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} AZN`;
}

export function thousands(n: number): string {
  const r = Math.round(n);
  return r.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function duration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function clock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const MONTHS: Record<Lang, string[]> = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  az: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'],
};
export const WEEKDAYS: Record<Lang, string[]> = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  az: ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'],
};
const WEEKDAYS_LONG: Record<Lang, string[]> = {
  ru: ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'],
  az: ['bazar ertəsi', 'çərşənbə axşamı', 'çərşənbə', 'cümə axşamı', 'cümə', 'şənbə', 'bazar'],
};

export function shortDate(t: number, lang: Lang): string {
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
}

export function weekdayLong(t: number, lang: Lang): string {
  return WEEKDAYS_LONG[lang][(new Date(t).getDay() + 6) % 7];
}

/** "сегодня", "вчера", "3 дн назад", or a date. */
export function relDay(t: number, now: number, lang: Lang): string {
  const a = new Date(t); a.setHours(0, 0, 0, 0);
  const b = new Date(now); b.setHours(0, 0, 0, 0);
  const d = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  if (d === 0) return lang === 'ru' ? 'сегодня' : 'bu gün';
  if (d === 1) return lang === 'ru' ? 'вчера' : 'dünən';
  if (d === -1) return lang === 'ru' ? 'завтра' : 'sabah';
  if (d > 1 && d < 7) return lang === 'ru' ? `${d} дн. назад` : `${d} gün əvvəl`;
  if (d < -1 && d > -7) return lang === 'ru' ? `через ${-d} дн.` : `${-d} gün sonra`;
  return shortDate(t, lang);
}

/** Russian plural picker: plural(n, ['день','дня','дней']). */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
