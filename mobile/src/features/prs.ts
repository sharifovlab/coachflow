// Personal records via estimated one-rep max (Epley).
import type { SetLog } from './types';

export function e1rm(w: number | null, r: number): number {
  if (!w || w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

export type Best = { ex: string; w: number; r: number; e1rm: number; at: number };

/** Best set (by e1RM) per exercise. Bodyweight sets are ignored. */
export function bestByExercise(sets: readonly SetLog[]): Map<string, Best> {
  const out = new Map<string, Best>();
  for (const s of sets) {
    const v = e1rm(s.w, s.r);
    if (v <= 0) continue;
    const cur = out.get(s.ex);
    if (!cur || v > cur.e1rm + 1e-9) out.set(s.ex, { ex: s.ex, w: s.w as number, r: s.r, e1rm: v, at: s.at });
  }
  return out;
}

export type PR = Best & { prev: Best };

/** PRs set in `session` compared with everything before it. First-ever attempts are not PRs. */
export function detectPRs(session: readonly SetLog[], history: readonly SetLog[]): PR[] {
  const ids = new Set(session.map((s) => s.sid));
  const before = bestByExercise(history.filter((s) => !ids.has(s.sid)));
  const now = bestByExercise(session);
  const prs: PR[] = [];
  for (const [ex, b] of now) {
    const prev = before.get(ex);
    if (prev && b.e1rm > prev.e1rm + 0.01) prs.push({ ...b, prev });
  }
  return prs.sort((a, b) => b.e1rm / b.prev.e1rm - a.e1rm / a.prev.e1rm);
}

/** Session ids in which a PR was set, walking history in time order. */
export function prTimeline(sets: readonly SetLog[]): { ex: string; at: number; e1rm: number; w: number; r: number }[] {
  const sorted = [...sets].sort((a, b) => a.at - b.at);
  const best = new Map<string, number>();
  const out: { ex: string; at: number; e1rm: number; w: number; r: number }[] = [];
  for (const s of sorted) {
    const v = e1rm(s.w, s.r);
    if (v <= 0) continue;
    const prev = best.get(s.ex);
    if (prev !== undefined && v > prev + 0.01) out.push({ ex: s.ex, at: s.at, e1rm: v, w: s.w as number, r: s.r });
    if (prev === undefined || v > prev) best.set(s.ex, v);
  }
  return out;
}

export function volume(sets: readonly SetLog[]): number {
  return sets.reduce((a, s) => a + (s.w ?? 0) * s.r, 0);
}
