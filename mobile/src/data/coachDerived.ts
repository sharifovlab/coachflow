// Coach-side derived data: client status, agenda for today, money for a month.
import { useMemo } from 'react';
import { prTimeline } from '@/features/prs';
import { DAY, dayKey, daysBetween, parseDayKey, startOfWeek } from '@/features/time';
import { useCoach, type Client, type CoachSet, type Lead, type Payment, type Report, type WSession } from './coach';

export type ClientStatus = 'overdue' | 'due' | 'silent' | 'new' | 'active';

export type ClientRow = Client & {
  lastAt: number | null;
  weekCount: number;
  dueIn: number | null; // days until next payment (negative = overdue)
  status: ClientStatus;
};

export function clientRows(clients: Client[], sessions: WSession[], now: number): ClientRow[] {
  const ws = startOfWeek(now);
  return clients.map((c) => {
    const mine = sessions.filter((s) => s.client_id === c.id);
    const lastAt = mine.length ? Math.max(...mine.map((s) => Date.parse(s.started_at))) : null;
    const weekCount = mine.filter((s) => Date.parse(s.started_at) >= ws).length;
    const dueIn = c.next_payment ? daysBetween(now, parseDayKey(c.next_payment)) : null;
    const ageDays = (now - Date.parse(c.created_at)) / DAY;
    const status: ClientStatus =
      dueIn !== null && dueIn < 0 ? 'overdue'
      : dueIn !== null && dueIn <= 3 ? 'due'
      : ageDays < 7 && !lastAt ? 'new'
      : !lastAt || now - lastAt > 7 * DAY ? 'silent'
      : 'active';
    return { ...c, lastAt, weekCount, dueIn, status };
  });
}

export type AgendaItem =
  | { kind: 'pay'; key: string; client: ClientRow }
  | { kind: 'lead'; key: string; lead: Lead }
  | { kind: 'report'; key: string; client: ClientRow; report: Report }
  | { kind: 'pr'; key: string; client: ClientRow; ex: string; w: number; r: number; at: number }
  | { kind: 'silent'; key: string; client: ClientRow };

export function agenda(rows: ClientRow[], leads: Lead[], reports: Report[], sets: CoachSet[], done: Set<string>, now: number): AgendaItem[] {
  const out: AgendaItem[] = [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  rows.filter((r) => r.dueIn !== null && r.dueIn <= 3).sort((a, b) => a.dueIn! - b.dueIn!)
    .forEach((c) => out.push({ kind: 'pay', key: `pay:${c.id}:${c.next_payment}`, client: c }));
  leads.filter((l) => l.status === 'new').forEach((l) => out.push({ kind: 'lead', key: `lead:${l.id}`, lead: l }));
  reports.filter((r) => r.from_client && now - Date.parse(r.created_at) < 3 * DAY).forEach((r) => {
    const c = byId.get(r.client_id);
    if (c) out.push({ kind: 'report', key: `rep:${r.id}`, client: c, report: r });
  });
  const weekStart = startOfWeek(now);
  const byClient = new Map<string, CoachSet[]>();
  sets.forEach((s) => { const l = byClient.get(s.client) ?? []; l.push(s); byClient.set(s.client, l); });
  byClient.forEach((list, cid) => {
    const c = byId.get(cid);
    if (!c) return;
    prTimeline(list).filter((p) => p.at >= weekStart).slice(-2)
      .forEach((p) => out.push({ kind: 'pr', key: `pr:${cid}:${p.ex}:${dayKey(p.at)}`, client: c, ex: p.ex, w: p.w, r: p.r, at: p.at }));
  });
  rows.filter((r) => r.status === 'silent').forEach((c) => out.push({ kind: 'silent', key: `silent:${c.id}:${dayKey(startOfWeek(now))}`, client: c }));
  return out.filter((i) => !done.has(i.key));
}

export function monthMoney(rows: ClientRow[], payments: Payment[], year: number, month: number) {
  const inMonth = (d: string) => { const t = parseDayKey(d); const x = new Date(t); return x.getFullYear() === year && x.getMonth() === month; };
  const received = payments.filter((p) => inMonth(p.paid_on));
  const receivedSum = received.reduce((a, p) => a + p.amount, 0);
  const upcoming = rows.filter((r) => r.next_payment && inMonth(r.next_payment) && (r.dueIn ?? 0) >= 0);
  const overdue = rows.filter((r) => (r.dueIn ?? 0) < 0);
  const expected = receivedSum + upcoming.reduce((a, r) => a + r.price, 0) + overdue.reduce((a, r) => a + r.price, 0);
  return { received, receivedSum, upcoming, overdue, overdueSum: overdue.reduce((a, r) => a + r.price, 0), expected };
}

export function useClientRows(now: number) {
  const clients = useCoach((s) => s.clients);
  const sessions = useCoach((s) => s.sessions);
  return useMemo(() => clientRows(clients, sessions, now), [clients, sessions, now]);
}
