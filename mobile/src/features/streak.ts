// Weekly streak: a week counts when the client trains at least `goal` times. Rest days never break it.
import { DAY, addDays, dayKey, startOfDay, startOfWeek } from './time';
import type { Session } from './types';

export function weeklyGoal(programDays: number): number {
  return Math.min(4, Math.max(2, programDays || 3));
}

/** Sessions that count: finished, or with a start (partial workouts still count as showing up). */
function sessionDays(sessions: readonly Session[]): number[] {
  return sessions.map((s) => s.startedAt);
}

export function weekCounts(sessions: readonly Session[], now: number, weeks = 12): { start: number; count: number }[] {
  const cur = startOfWeek(now);
  const out: { start: number; count: number }[] = [];
  for (let w = weeks - 1; w >= 0; w--) out.push({ start: addDays(cur, -7 * w), count: 0 });
  const days = sessionDays(sessions);
  for (const t of days) {
    const ws = startOfWeek(t);
    const slot = out.find((o) => o.start === ws);
    if (slot) slot.count++;
  }
  return out;
}

export function weeklyStreak(sessions: readonly Session[], goal: number, now: number) {
  const weeks = weekCounts(sessions, now, 104);
  const thisWeek = weeks[weeks.length - 1].count;
  let streak = thisWeek >= goal ? 1 : 0;
  for (let i = weeks.length - 2; i >= 0; i--) {
    if (weeks[i].count >= goal) streak++;
    else break;
  }
  const daysLeft = 7 - Math.round((startOfDay(now) - startOfWeek(now)) / DAY);
  return { streak, thisWeek, goal, daysLeft, atRisk: thisWeek < goal && goal - thisWeek >= daysLeft };
}

/** Days of the current week (Mon..Sun) with a workout flag. */
export function weekDots(sessions: readonly Session[], now: number): { key: string; done: boolean; today: boolean; future: boolean }[] {
  const start = startOfWeek(now);
  const trained = new Set(sessions.map((s) => dayKey(s.startedAt)));
  const today = dayKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const t = addDays(start, i);
    const k = dayKey(t);
    return { key: k, done: trained.has(k), today: k === today, future: t > now };
  });
}

/** Activity grid for the last `weeks` weeks: rows = weeks (oldest first), 7 cells of set counts. */
export function activityGrid(setTimes: readonly number[], now: number, weeks = 12): number[][] {
  const first = addDays(startOfWeek(now), -7 * (weeks - 1));
  const grid = Array.from({ length: weeks }, () => Array(7).fill(0) as number[]);
  for (const t of setTimes) {
    if (t < first || t > now) continue;
    const d = Math.round((startOfDay(t) - first) / DAY);
    const w = Math.floor(d / 7);
    if (w >= 0 && w < weeks) grid[w][d % 7]++;
  }
  return grid;
}
