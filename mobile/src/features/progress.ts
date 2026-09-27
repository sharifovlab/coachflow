// Body-weight trend: smoothed line and change over a window.
import { DAY } from './time';
import { parseDayKey } from './time';
import type { WeightEntry } from './types';

export type WeightPoint = { t: number; kg: number };

export function weightPoints(entries: readonly WeightEntry[]): WeightPoint[] {
  const byDay = new Map<string, number>();
  for (const e of entries) if (e.kg != null && e.kg > 0) byDay.set(e.d, Number(e.kg));
  return [...byDay.entries()].map(([d, kg]) => ({ t: parseDayKey(d), kg })).sort((a, b) => a.t - b.t);
}

/** Exponential moving average (alpha 0.3), the "trend weight". */
export function trend(points: readonly WeightPoint[], alpha = 0.3): WeightPoint[] {
  const out: WeightPoint[] = [];
  let v: number | null = null;
  for (const p of points) {
    v = v === null ? p.kg : v + alpha * (p.kg - v);
    out.push({ t: p.t, kg: Math.round(v * 10) / 10 });
  }
  return out;
}

/** Change of the trend over the last `days` days (null when not enough data). */
export function trendChange(points: readonly WeightPoint[], days: number, now: number): number | null {
  const tr = trend(points);
  if (tr.length < 2) return null;
  const last = tr[tr.length - 1];
  const from = now - days * DAY;
  const base = [...tr].reverse().find((p) => p.t <= from) ?? tr[0];
  if (base === last) return null;
  return Math.round((last.kg - base.kg) * 10) / 10;
}
