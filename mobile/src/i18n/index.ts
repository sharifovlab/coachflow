// t('key', {n: 3}) with az/ru dictionaries. Keys are typed from ru.ts; az.ts must have every key.
import { useCallback } from 'react';
import { useLang } from '@/data/settings';
import { settings } from '@/data/settings';
import { MUSCLE_LABEL, type Muscle } from '@/features/muscles';
import { exerciseName } from '@/features/exercises';
import { plural } from '@/features/format';
import { az } from './az';
import { ru } from './ru';

export type Key = keyof typeof ru;
const DICT = { ru, az } as const;

/** {n} inserts a value; {n|день|дня|дней} picks the Russian plural form for n. */
function fill(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s
    .replace(/\{(\w+)\|([^}]+)\}/g, (_, k, forms: string) => {
      const f = forms.split('|');
      return f.length === 3 ? plural(Number(vars[k]), f as [string, string, string]) : f[0];
    })
    .replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? `{${k}}` : String(vars[k])));
}

export function translate(lang: 'az' | 'ru', key: Key, vars?: Record<string, string | number>): string {
  return fill(DICT[lang][key] ?? ru[key] ?? key, vars);
}

/** Non-hook access (outside components). */
export function tNow(key: Key, vars?: Record<string, string | number>) {
  return translate(settings.get().lang, key, vars);
}

export function useT() {
  const lang = useLang();
  const t = useCallback((key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const muscle = useCallback((m: Muscle) => MUSCLE_LABEL[lang][m], [lang]);
  const ex = useCallback((id: string) => (id.startsWith('custom:') ? id.slice(7) : exerciseName(id, lang)), [lang]);
  return { t, lang, muscle, ex };
}
