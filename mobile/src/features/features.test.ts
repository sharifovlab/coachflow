import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exercises';
import { MUSCLES } from './muscles';
import { creditsFromSets, heatForRange, levelOf, planHeat, rangeWindow, topMuscles, emptyCredits } from './load';
import { readiness, stateOf, regionReadiness, hoursUntilReady } from './recovery';
import { e1rm, bestByExercise, detectPRs, prTimeline, volume } from './prs';
import { weeklyStreak, weekDots, activityGrid, weeklyGoal } from './streak';
import { balanceInsight } from './insights';
import { normalizeProgram, nextDay, lastPerformance, parseScheme, repsTarget, matchExercise } from './program';
import { weightPoints, trend, trendChange } from './progress';
import { kg, money, duration, plural, relDay } from './format';
import { DAY, HOUR, startOfWeek, dayKey } from './time';
import type { SetLog, Session } from './types';

const NOW = new Date(2026, 8, 24, 18, 0, 0).getTime(); // Thu 24 Sep 2026 18:00
const set = (sid: string, ex: string, i: number, w: number | null, r: number, at: number): SetLog => ({ sid, ex, order: 0, i, w, r, at });

describe('catalog', () => {
  it('every exercise uses known muscles and every muscle is trained', () => {
    const known = new Set<string>(MUSCLES);
    const hit = new Set<string>();
    for (const e of EXERCISES) {
      for (const m of [...e.primary, ...e.secondary]) { expect(known.has(m)).toBe(true); hit.add(m); }
      expect(e.primary.length).toBeGreaterThan(0);
    }
    expect(hit.size).toBe(MUSCLES.length);
  });
});

describe('load', () => {
  it('credits primary 1 and secondary 0.5', () => {
    const c = creditsFromSets([set('a', 'bench_press', 0, 60, 10, NOW), set('a', 'bench_press', 1, 60, 10, NOW)]);
    expect(c.chest).toBe(2);
    expect(c.triceps).toBe(1);
    expect(c.delts).toBe(1);
    expect(c.quads).toBe(0);
  });
  it('custom exercises give no credit', () => {
    expect(creditsFromSets([set('a', 'custom:Жим', 0, 10, 10, NOW)]).chest).toBe(0);
  });
  it('level thresholds', () => {
    expect(levelOf(0, 10)).toBe(0);
    expect(levelOf(3, 10)).toBe(1);
    expect(levelOf(5, 10)).toBe(2);
    expect(levelOf(9, 10)).toBe(3);
    expect(levelOf(10, 10)).toBe(4);
  });
  it('range windows', () => {
    expect(rangeWindow('today', NOW).target).toBe(3.5);
    expect(rangeWindow('week', NOW).from).toBe(startOfWeek(NOW));
    expect(new Date(rangeWindow('week', NOW).from).getDay()).toBe(1);
    expect(rangeWindow('d30', NOW).target).toBeCloseTo(42.86, 1);
  });
  it('heat for range excludes older sets', () => {
    const sets = [set('a', 'back_squat', 0, 100, 5, NOW - 2 * HOUR), set('b', 'back_squat', 0, 100, 5, NOW - 10 * DAY)];
    expect(heatForRange(sets, 'today', NOW).credits.quads).toBe(1);
    expect(heatForRange(sets, 'd7', NOW).credits.quads).toBe(1);
    expect(heatForRange(sets, 'd30', NOW).credits.quads).toBe(2);
  });
  it('plan heat and top muscles', () => {
    const p = planHeat([{ ex: 'back_squat', sets: 4, reps: '8', rest: 120, note: '' }]);
    expect(p.levels.quads).toBe(4);
    expect(topMuscles(p.credits, 2).sort()).toEqual(['glutes', 'quads']);
    expect(topMuscles(emptyCredits())).toEqual([]);
  });
});

describe('recovery', () => {
  it('fresh when nothing trained, fatigued right after heavy work, recovers over time', () => {
    expect(readiness([], NOW).chest).toBe(100);
    const sets = Array.from({ length: 6 }, (_, i) => set('a', 'bench_press', i, 60, 8, NOW - HOUR));
    const r1 = readiness(sets, NOW).chest;
    expect(r1).toBeLessThan(50);
    const r3 = readiness(sets, NOW + 3 * DAY).chest;
    expect(r3).toBeGreaterThan(r1);
    expect(stateOf(r1)).toBe('fatigued');
    expect(stateOf(85)).toBe('ready');
    expect(stateOf(60)).toBe('recovering');
    const h = hoursUntilReady(sets, 'chest', NOW);
    expect(h).toBeGreaterThan(24);
    expect(readiness(sets, NOW + h * HOUR).chest).toBeGreaterThanOrEqual(80);
    expect(regionReadiness(readiness(sets, NOW)).find((g) => g.id === 'chest')!.state).toBe('fatigued');
  });
  it('ignores future sets', () => {
    expect(readiness([set('a', 'bench_press', 0, 60, 8, NOW + HOUR)], NOW).chest).toBe(100);
  });
});

describe('prs', () => {
  it('epley', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 1);
    expect(e1rm(null, 10)).toBe(0);
  });
  it('detects a PR only against earlier history', () => {
    const hist = [set('old', 'bench_press', 0, 60, 8, NOW - 7 * DAY)];
    const sess = [set('new', 'bench_press', 0, 62.5, 8, NOW), set('new', 'back_squat', 0, 80, 5, NOW)];
    const prs = detectPRs(sess, [...hist, ...sess]);
    expect(prs).toHaveLength(1);
    expect(prs[0].ex).toBe('bench_press');
    expect(prs[0].prev.w).toBe(60);
    expect(bestByExercise(sess).get('back_squat')!.w).toBe(80);
    expect(prTimeline([...hist, ...sess])).toHaveLength(1);
    expect(volume(sess)).toBe(62.5 * 8 + 400);
  });
});

describe('streak', () => {
  const sess = (t: number, id = String(t)): Session => ({ id, dayId: null, dayName: '', startedAt: t, finishedAt: t + HOUR, feel: null });
  it('counts consecutive weeks meeting the goal', () => {
    const w = startOfWeek(NOW);
    const s = [sess(w + HOUR), sess(w + DAY + HOUR), sess(w - 7 * DAY + HOUR), sess(w - 6 * DAY + HOUR), sess(w - 20 * DAY)];
    const r = weeklyStreak(s, 2, NOW);
    expect(r.streak).toBe(2);
    expect(r.thisWeek).toBe(2);
  });
  it('current unfinished week does not break the streak', () => {
    const w = startOfWeek(NOW);
    const s = [sess(w - 7 * DAY + HOUR), sess(w - 6 * DAY + HOUR)];
    const r = weeklyStreak(s, 2, NOW);
    expect(r.streak).toBe(1);
    expect(r.daysLeft).toBe(4);
    expect(r.atRisk).toBe(false);
  });
  it('week dots and activity grid', () => {
    const dots = weekDots([sess(NOW - DAY)], NOW);
    expect(dots).toHaveLength(7);
    expect(dots.filter((d) => d.done)).toHaveLength(1);
    expect(dots.find((d) => d.today)!.key).toBe(dayKey(NOW));
    const g = activityGrid([NOW, NOW - HOUR, NOW - 8 * DAY], NOW, 4);
    expect(g).toHaveLength(4);
    expect(g[3][3]).toBe(2);
    expect(g[2][2]).toBe(1);
    expect(weeklyGoal(0)).toBe(3);
    expect(weeklyGoal(6)).toBe(4);
  });
});

describe('insights', () => {
  it('flags push-heavy week', () => {
    const c = emptyCredits();
    c.chest = 10; c.lats = 2; c.upper_back = 1;
    c.quads = 5; c.hamstrings = 4;
    const i = balanceInsight(c)!;
    expect(i.pair).toBe('push_pull');
    expect(i.weak).toEqual(['lats', 'upper_back']);
  });
  it('stays quiet with little data or balanced work', () => {
    const c = emptyCredits();
    c.chest = 3;
    expect(balanceInsight(c)).toBeNull();
    c.chest = 8; c.lats = 5;
    expect(balanceInsight(c)).toBeNull();
  });
});

describe('program', () => {
  it('normalises day programs and legacy text programs', () => {
    const p = normalizeProgram({ id: 'p', name: 'A', days: [{ id: 'd1', name: 'Ноги', items: [{ ex: 'back_squat', sets: 4, reps: '8', rest: 120 }] }, { id: 'd2', name: '', items: [] }] })!;
    expect(p.days).toHaveLength(1);
    const legacy = normalizeProgram({ id: 'p', name: 'Old', days: [], legacy: [{ n: 'Приседания со штангой', s: '4x10' }, { n: 'Моё упражнение', s: '' }] })!;
    expect(legacy.days[0].items[0]).toMatchObject({ ex: 'back_squat', sets: 4, reps: '10' });
    expect(legacy.days[0].items[1].ex).toBe('custom:Моё упражнение');
    expect(normalizeProgram(null)).toBeNull();
  });
  it('next day rotates after the last trained day', () => {
    const p = normalizeProgram({ id: 'p', name: 'A', days: ['a', 'b', 'c'].map((id) => ({ id, name: id, items: [{ ex: 'crunch' }] })) })!;
    expect(nextDay(p, [])!.id).toBe('a');
    const s = (dayId: string, t: number): Session => ({ id: dayId + t, dayId, dayName: '', startedAt: t, finishedAt: null, feel: null });
    expect(nextDay(p, [s('a', 1), s('b', 2)])!.id).toBe('c');
    expect(nextDay(p, [s('c', 5), s('a', 1)])!.id).toBe('a');
  });
  it('last performance, schemes, reps', () => {
    const sets = [set('x', 'bench_press', 1, 60, 8, 10), set('x', 'bench_press', 0, 60, 10, 5), set('y', 'bench_press', 0, 65, 6, 20)];
    expect(lastPerformance('bench_press', sets).map((s) => s.w)).toEqual([65]);
    expect(lastPerformance('bench_press', sets, 'y').map((s) => s.r)).toEqual([10, 8]);
    expect(parseScheme('3×8-12')).toEqual({ sets: 3, reps: '8-12' });
    expect(parseScheme('4х10')).toEqual({ sets: 4, reps: '10' });
    expect(repsTarget('8-12')).toBe(12);
    expect(matchExercise('Становая тяга')).toBe('deadlift');
  });
});

describe('progress', () => {
  it('trend smooths and measures change', () => {
    const pts = weightPoints([
      { d: '2026-09-01', kg: 80, note: '', photo: false },
      { d: '2026-09-08', kg: 79, note: '', photo: false },
      { d: '2026-09-15', kg: 78, note: '', photo: false },
      { d: '2026-09-22', kg: null, note: '', photo: true },
    ]);
    expect(pts).toHaveLength(3);
    expect(trend(pts)[2].kg).toBeLessThan(80);
    expect(trendChange(pts, 30, NOW)).toBeLessThan(0);
    expect(trendChange(pts.slice(0, 1), 30, NOW)).toBeNull();
  });
});

describe('format', () => {
  it('formats', () => {
    expect(kg(62.5)).toBe('62,5');
    expect(money(1200)).toBe('1 200 AZN');
    expect(duration(65_000)).toBe('1:05');
    expect(duration(3_725_000)).toBe('1:02:05');
    expect(plural(1, ['день', 'дня', 'дней'])).toBe('день');
    expect(plural(3, ['день', 'дня', 'дней'])).toBe('дня');
    expect(plural(12, ['день', 'дня', 'дней'])).toBe('дней');
    expect(relDay(NOW - DAY, NOW, 'ru')).toBe('вчера');
    expect(relDay(NOW, NOW, 'az')).toBe('bu gün');
  });
});
