// Program helpers: normalising legacy programs, picking the next day, last performance.
import { EXERCISES } from './exercises';
import type { PlanItem, Program, ProgramDay, Session, SetLog } from './types';

type RawProgram = { id: string; name: string; days?: unknown; legacy?: unknown } | null | undefined;

function toItem(x: any): PlanItem | null {
  if (!x || typeof x.ex !== 'string') return null;
  return {
    ex: x.ex,
    sets: Math.max(1, Math.min(20, Number(x.sets) || 3)),
    reps: String(x.reps ?? '10'),
    rest: Math.max(0, Math.min(600, Number(x.rest) || 90)),
    note: String(x.note ?? ''),
  };
}

/** Best-effort match of a free-text exercise name to the catalog. */
export function matchExercise(name: string): string | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  const exact = EXERCISES.find((e) => [e.ru, e.az, e.en].some((x) => x.toLowerCase() === n));
  if (exact) return exact.id;
  const part = EXERCISES.find((e) => [e.ru, e.az, e.en].some((x) => x.toLowerCase().includes(n) || n.includes(x.toLowerCase())));
  return part ? part.id : null;
}

/** "4x10" / "4×8-10" → sets, reps. */
export function parseScheme(s: string): { sets: number; reps: string } {
  const m = /(\d+)\s*[x×х*]\s*([\d\-–]+)/i.exec(s || '');
  if (!m) return { sets: 3, reps: '10' };
  return { sets: Math.min(20, Number(m[1])), reps: m[2].replace('–', '-') };
}

export function normalizeProgram(raw: RawProgram): Program | null {
  if (!raw) return null;
  let days: ProgramDay[] = [];
  if (Array.isArray(raw.days)) {
    days = raw.days
      .map((d: any, i: number) => ({
        id: String(d?.id ?? `d${i + 1}`),
        name: String(d?.name ?? ''),
        items: Array.isArray(d?.items) ? (d.items.map(toItem).filter(Boolean) as PlanItem[]) : [],
      }))
      .filter((d) => d.items.length > 0);
  }
  if (days.length === 0 && Array.isArray(raw.legacy)) {
    const items: PlanItem[] = [];
    for (const l of raw.legacy as any[]) {
      const name = String(l?.n ?? '');
      const { sets, reps } = parseScheme(String(l?.s ?? ''));
      const id = matchExercise(name) ?? `custom:${name.slice(0, 50)}`;
      if (name) items.push({ ex: id, sets, reps, rest: 90, note: '' });
    }
    if (items.length) days = [{ id: 'legacy', name: raw.name, items }];
  }
  return { id: raw.id, name: raw.name, days };
}

/** Day after the most recently trained program day; the first day when nothing is logged yet. */
export function nextDay(program: Program | null, sessions: readonly Session[]): ProgramDay | null {
  if (!program || program.days.length === 0) return null;
  const done = [...sessions].filter((s) => s.dayId).sort((a, b) => b.startedAt - a.startedAt);
  for (const s of done) {
    const i = program.days.findIndex((d) => d.id === s.dayId);
    if (i >= 0) return program.days[(i + 1) % program.days.length];
  }
  return program.days[0];
}

/** Sets of an exercise from the latest session that contained it (optionally excluding a session). */
export function lastPerformance(ex: string, sets: readonly SetLog[], excludeSid?: string): SetLog[] {
  let latest: SetLog | null = null;
  for (const s of sets) if (s.ex === ex && s.sid !== excludeSid && (!latest || s.at > latest.at)) latest = s;
  if (!latest) return [];
  return sets.filter((s) => s.sid === latest!.sid && s.ex === ex).sort((a, b) => a.i - b.i);
}

/** Reps target: "8-10" → 10 upper, used for prefill when no history. */
export function repsTarget(reps: string): number {
  const nums = (reps.match(/\d+/g) ?? []).map(Number);
  return nums.length ? nums[nums.length - 1] : 10;
}

export function estimateMinutes(items: readonly PlanItem[]): number {
  const sec = items.reduce((a, it) => a + it.sets * (40 + it.rest), 0);
  return Math.max(10, Math.round(sec / 60 / 5) * 5);
}
