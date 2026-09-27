// Muscle load: set-credits per muscle over a time range, and the heat level (0–4) for the body map.
import { exercise } from './exercises';
import { MUSCLES, type Muscle } from './muscles';
import { DAY, startOfDay, startOfWeek } from './time';
import type { PlanItem, ProgramDay, Range, SetLog } from './types';

export const PRIMARY_CREDIT = 1;
export const SECONDARY_CREDIT = 0.5;
export const WEEK_TARGET = 10; // set-credits per muscle per 7 days
export const TODAY_TARGET = 3.5;

export type Credits = Record<Muscle, number>;
export type Levels = Record<Muscle, 0 | 1 | 2 | 3 | 4>;

export function emptyCredits(): Credits {
  return Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Credits;
}

/** Credits one set of an exercise gives each muscle. Unknown (custom) exercises give nothing. */
export function creditsOfExercise(exId: string, sets = 1, into: Credits = emptyCredits()): Credits {
  const e = exercise(exId);
  if (!e) return into;
  for (const m of e.primary) into[m] += PRIMARY_CREDIT * sets;
  for (const m of e.secondary) into[m] += SECONDARY_CREDIT * sets;
  return into;
}

export function creditsFromSets(sets: readonly SetLog[], from = -Infinity, to = Infinity): Credits {
  const c = emptyCredits();
  for (const s of sets) if (s.at >= from && s.at < to) creditsOfExercise(s.ex, 1, c);
  return c;
}

export function rangeWindow(range: Range, now: number): { from: number; to: number; target: number } {
  const end = now + 1;
  switch (range) {
    case 'today':
      return { from: startOfDay(now), to: end, target: TODAY_TARGET };
    case 'week':
      return { from: startOfWeek(now), to: end, target: WEEK_TARGET };
    case 'd7':
      return { from: now - 7 * DAY, to: end, target: WEEK_TARGET };
    case 'd30':
      return { from: now - 30 * DAY, to: end, target: (WEEK_TARGET * 30) / 7 };
  }
}

export function levelOf(credits: number, target: number): 0 | 1 | 2 | 3 | 4 {
  if (credits <= 0) return 0;
  const ratio = credits / target;
  if (ratio < 0.34) return 1;
  if (ratio < 0.67) return 2;
  if (ratio < 1) return 3;
  return 4;
}

export function levelsOf(credits: Credits, target: number): Levels {
  return Object.fromEntries(MUSCLES.map((m) => [m, levelOf(credits[m], target)])) as Levels;
}

export function heatForRange(sets: readonly SetLog[], range: Range, now: number) {
  const { from, to, target } = rangeWindow(range, now);
  const credits = creditsFromSets(sets, from, to);
  return { credits, levels: levelsOf(credits, target), target };
}

/** Planned credits of a workout day, shown as heat against the single-session target. */
export function planHeat(items: readonly PlanItem[]): { credits: Credits; levels: Levels } {
  const c = emptyCredits();
  for (const it of items) creditsOfExercise(it.ex, it.sets, c);
  return { credits: c, levels: levelsOf(c, TODAY_TARGET) };
}

/** Muscles sorted by credits, highest first, only those > 0. */
export function topMuscles(credits: Credits, n = 3): Muscle[] {
  return MUSCLES.filter((m) => credits[m] > 0)
    .sort((a, b) => credits[b] - credits[a])
    .slice(0, n);
}

/** Weekly coverage of a program, assuming each day is done once per week. */
export function programCoverage(days: readonly ProgramDay[]): { credits: Credits; levels: Levels } {
  const c = emptyCredits();
  days.forEach((d) => d.items.forEach((it) => creditsOfExercise(it.ex, it.sets, c)));
  return { credits: c, levels: levelsOf(c, WEEK_TARGET) };
}
