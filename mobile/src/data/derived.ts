// Memoised numbers the client screens share (readiness, streak, next workout).
import { useMemo } from 'react';
import { planHeat } from '@/features/load';
import { nextDay, estimateMinutes } from '@/features/program';
import { readiness, regionReadiness } from '@/features/recovery';
import { weeklyGoal, weeklyStreak, weekDots } from '@/features/streak';
import { useClientData } from './client';

export function useClientDerived(now: number) {
  const data = useClientData();
  const { view, sessions, sets } = data;
  return useMemo(() => {
    const program = view?.program ?? null;
    const goal = weeklyGoal(program?.days.length ?? 0);
    const day = nextDay(program, sessions);
    const ready = readiness(sets, now);
    return {
      ...data,
      program,
      day,
      dayIndex: day && program ? program.days.findIndex((d) => d.id === day.id) : -1,
      plan: day ? planHeat(day.items) : null,
      minutes: day ? estimateMinutes(day.items) : 0,
      ready,
      regions: regionReadiness(ready),
      streak: weeklyStreak(sessions, goal, now),
      dots: weekDots(sessions, now),
      lastSession: sessions.length ? sessions[sessions.length - 1] : null,
    };
  }, [data, view, sessions, sets, now]);
}
