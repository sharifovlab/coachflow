// Readiness: how recovered each muscle is, from exponentially decaying fatigue.
import { exercise } from './exercises';
import { LARGE_MUSCLES, MUSCLES, REGIONS, type Muscle } from './muscles';
import { HOUR } from './time';
import type { SetLog } from './types';
import { PRIMARY_CREDIT, SECONDARY_CREDIT } from './load';

export const TAU_SMALL_H = 36;
export const TAU_LARGE_H = 48;
const LOOKBACK_H = 24 * 10;

export type Readiness = Record<Muscle, number>;
export type ReadinessState = 'ready' | 'recovering' | 'fatigued';

export function tauOf(m: Muscle): number {
  return LARGE_MUSCLES.has(m) ? TAU_LARGE_H : TAU_SMALL_H;
}

export function fatigue(sets: readonly SetLog[], now: number): Record<Muscle, number> {
  const f = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  for (const s of sets) {
    const h = (now - s.at) / HOUR;
    if (h < 0 || h > LOOKBACK_H) continue;
    const e = exercise(s.ex);
    if (!e) continue;
    for (const m of e.primary) f[m] += PRIMARY_CREDIT * Math.exp(-h / tauOf(m));
    for (const m of e.secondary) f[m] += SECONDARY_CREDIT * Math.exp(-h / tauOf(m));
  }
  return f;
}

export function readiness(sets: readonly SetLog[], now: number): Readiness {
  const f = fatigue(sets, now);
  return Object.fromEntries(MUSCLES.map((m) => [m, Math.round(100 * Math.exp(-f[m] / 4))])) as Readiness;
}

export function stateOf(pct: number): ReadinessState {
  if (pct >= 80) return 'ready';
  if (pct >= 50) return 'recovering';
  return 'fatigued';
}

/** Region readiness = its least recovered muscle. */
export function regionReadiness(r: Readiness): { id: string; pct: number; state: ReadinessState }[] {
  return REGIONS.map((g) => {
    const pct = Math.min(...g.muscles.map((m) => r[m]));
    return { id: g.id, pct, state: stateOf(pct) };
  });
}

/** Hours until a muscle reaches 80% readiness if nothing else is trained. 0 if already there. */
export function hoursUntilReady(sets: readonly SetLog[], m: Muscle, now: number): number {
  const f0 = fatigue(sets, now)[m];
  const limit = -4 * Math.log(0.8); // fatigue at which readiness = 80%
  if (f0 <= limit) return 0;
  return Math.ceil(tauOf(m) * Math.log(f0 / limit));
}
