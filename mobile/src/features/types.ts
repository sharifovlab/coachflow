// Shared domain types used by features/ and data/.

/** One completed set. `at` is epoch ms. `w` is kg (null = bodyweight). */
export type SetLog = { sid: string; ex: string; order: number; i: number; w: number | null; r: number; at: number };

export type Session = {
  id: string;
  dayId: string | null;
  dayName: string;
  startedAt: number;
  finishedAt: number | null;
  feel: number | null;
};

export type PlanItem = { ex: string; sets: number; reps: string; rest: number; note: string };
export type ProgramDay = { id: string; name: string; items: PlanItem[] };
export type Program = { id: string; name: string; days: ProgramDay[] };

export type WeightEntry = { d: string; kg: number | null; note: string; photo: boolean };

export type Range = 'today' | 'week' | 'd7' | 'd30';
