// Exercise catalog (shared/exercises.json) and lookups.
import catalog from '@shared/exercises.json';
import type { Muscle } from './muscles';

export type Exercise = {
  id: string;
  en: string;
  ru: string;
  az: string;
  primary: Muscle[];
  secondary: Muscle[];
  equipment: string;
  pattern: string;
};

export const EXERCISES: Exercise[] = (catalog as { exercises: Exercise[] }).exercises;
const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function exercise(id: string): Exercise | undefined {
  return byId.get(id);
}

export function exerciseName(id: string, lang: 'az' | 'ru'): string {
  const e = byId.get(id);
  return e ? e[lang] : id;
}

/** Exercises that train a muscle, primary movers first. */
export function exercisesFor(m: Muscle): Exercise[] {
  const primary = EXERCISES.filter((e) => e.primary.includes(m));
  const secondary = EXERCISES.filter((e) => !e.primary.includes(m) && e.secondary.includes(m));
  return [...primary, ...secondary];
}

export function searchExercises(q: string, lang: 'az' | 'ru'): Exercise[] {
  const s = q.trim().toLowerCase();
  if (!s) return EXERCISES;
  return EXERCISES.filter((e) => e[lang].toLowerCase().includes(s) || e.en.toLowerCase().includes(s) || e.ru.toLowerCase().includes(s) || e.az.toLowerCase().includes(s));
}
