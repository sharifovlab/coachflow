// Coach data: Supabase Auth session + the coach's own rows (RLS limits every query to them).
import type { Session as AuthSession } from '@supabase/supabase-js';
import { normalizeProgram } from '@/features/program';
import type { Program, ProgramDay, SetLog } from '@/features/types';
import { dayKey } from '@/features/time';
import { createStore, useStore } from './store';
import { sb } from './supabase';

export type Coach = { id: string; name: string; slug: string; card: string; phone: string; instagram: string; lang: 'az' | 'ru' };
export type Client = {
  id: string; name: string; phone: string; lang: 'az' | 'ru'; goal: 'lose' | 'gain' | 'fit' | 'rehab';
  billing_type: 'monthly' | 'package' | 'installment'; price: number; months: number; parts: number; parts_paid: number;
  next_payment: string | null; check_day: number; program_id: string | null; join_code: string; access_token: string; created_at: string;
};
export type Payment = { id: string; client_id: string; amount: number; paid_on: string; method: string; part: number | null; parts: number | null };
export type Report = { id: string; client_id: string; report_date: string; weight: number | null; note: string; photo_path: string | null; from_client: boolean; created_at: string };
export type Lead = { id: string; name: string; phone: string; goal: string; level: string; lang: 'az' | 'ru'; health: string; status: string; created_at: string };
export type WSession = { id: string; client_id: string; day_name: string; started_at: string; finished_at: string | null; feel: number | null };
export type CoachSet = SetLog & { client: string };

type CoachState = {
  auth: AuthSession | null;
  authReady: boolean;
  coach: Coach | null;
  clients: Client[];
  payments: Payment[];
  reports: Report[];
  leads: Lead[];
  programs: Program[];
  sessions: WSession[];
  sets: CoachSet[];
  todoDone: Set<string>;
  loading: boolean;
  loadedAt: number;
  error: string | null;
};

export const coachStore = createStore<CoachState>({
  auth: null, authReady: false, coach: null, clients: [], payments: [], reports: [], leads: [], programs: [],
  sessions: [], sets: [], todoDone: new Set(), loading: false, loadedAt: 0, error: null,
});

export const useCoach = <S,>(sel: (s: CoachState) => S) => useStore(coachStore, sel);

export async function initCoachAuth() {
  const { data } = await sb.auth.getSession();
  coachStore.set({ auth: data.session, authReady: true });
  sb.auth.onAuthStateChange((_e, session) => coachStore.set({ auth: session }));
}

export async function signIn(email: string, password: string) {
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  return error ? error.message : null;
}

export async function signUp(email: string, password: string, name: string, lang: 'az' | 'ru') {
  const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { name, lang } } });
  if (error) return { error: error.message, needsConfirm: false };
  return { error: null, needsConfirm: !data.session };
}

export async function signOut() {
  await sb.auth.signOut();
  coachStore.set({ coach: null, clients: [], payments: [], reports: [], leads: [], programs: [], sessions: [], sets: [], loadedAt: 0 });
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export async function loadCoach(): Promise<boolean> {
  const uid = coachStore.get().auth?.user.id;
  if (!uid) return false;
  coachStore.set({ loading: true, error: null });
  const [co, cl, pay, rep, lead, prog, ses, sets, todo] = await Promise.all([
    sb.from('coaches').select('id,name,slug,card,phone,instagram,lang').eq('id', uid).maybeSingle(),
    sb.from('clients').select('id,name,phone,lang,goal,billing_type,price,months,parts,parts_paid,next_payment,check_day,program_id,join_code,access_token,created_at').order('name'),
    sb.from('payments').select('id,client_id,amount,paid_on,method,part,parts').gte('paid_on', dayKey(Date.now() - 400 * 86_400_000)).order('paid_on', { ascending: false }),
    sb.from('reports').select('id,client_id,report_date,weight,note,photo_path,from_client,created_at').gte('created_at', daysAgo(365)).order('created_at', { ascending: false }),
    sb.from('leads').select('id,name,phone,goal,level,lang,health,status,created_at').order('created_at', { ascending: false }).limit(100),
    sb.from('programs').select('id,name,days,exercises').order('created_at'),
    sb.from('workout_sessions').select('id,client_id,day_name,started_at,finished_at,feel').gte('started_at', daysAgo(90)).order('started_at', { ascending: false }),
    sb.from('set_logs').select('session_id,client_id,exercise_id,ex_order,set_index,weight,reps,done_at').gte('done_at', daysAgo(90)).order('done_at').limit(10000),
    sb.from('todo_done').select('key').eq('day', dayKey(Date.now())),
  ]);
  const err = [co, cl, pay, rep, lead, prog, ses, sets, todo].find((r) => r.error)?.error;
  if (err) {
    coachStore.set({ loading: false, error: err.message });
    return false;
  }
  coachStore.set({
    coach: co.data as Coach,
    clients: (cl.data ?? []).map((c: any) => ({ ...c, price: Number(c.price) })),
    payments: (pay.data ?? []).map((p: any) => ({ ...p, amount: Number(p.amount) })),
    reports: (rep.data ?? []).map((r: any) => ({ ...r, weight: r.weight == null ? null : Number(r.weight) })),
    leads: lead.data as Lead[],
    programs: (prog.data ?? []).map((p: any) => normalizeProgram({ id: p.id, name: p.name, days: p.days, legacy: p.exercises })!),
    sessions: ses.data as WSession[],
    sets: (sets.data ?? []).map((s: any) => ({
      sid: s.session_id, client: s.client_id, ex: s.exercise_id, order: s.ex_order, i: s.set_index,
      w: s.weight == null ? null : Number(s.weight), r: s.reps, at: Date.parse(s.done_at),
    })),
    todoDone: new Set((todo.data ?? []).map((t: any) => t.key)),
    loading: false,
    loadedAt: Date.now(),
  });
  return true;
}

// ---------- mutations ----------

export type NewClient = Pick<Client, 'name' | 'phone' | 'lang' | 'goal' | 'billing_type' | 'price' | 'months' | 'parts' | 'next_payment' | 'program_id'>;

export async function addClient(c: NewClient): Promise<Client | string> {
  const uid = coachStore.get().auth?.user.id;
  const { data, error } = await sb
    .from('clients')
    .insert({ ...c, coach_id: uid })
    .select('id,name,phone,lang,goal,billing_type,price,months,parts,parts_paid,next_payment,check_day,program_id,join_code,access_token,created_at')
    .single();
  if (error) return error.message;
  const client = { ...(data as any), price: Number(data.price) } as Client;
  coachStore.set((s) => ({ clients: [...s.clients, client].sort((a, b) => a.name.localeCompare(b.name)) }));
  return client;
}

export async function updateClient(id: string, patch: Partial<NewClient> & { check_day?: number }) {
  const { error } = await sb.from('clients').update(patch).eq('id', id);
  if (error) return error.message;
  coachStore.set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  return null;
}

export async function deleteClient(id: string) {
  const { error } = await sb.from('clients').delete().eq('id', id);
  if (error) return error.message;
  coachStore.set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
  return null;
}

export async function recordPayment(clientId: string, amount: number, method: 'card' | 'cash' | 'online' = 'card') {
  const { error } = await sb.rpc('record_payment', { p_client: clientId, p_amount: amount, p_paid_on: dayKey(Date.now()), p_method: method });
  if (error) return error.message;
  await loadCoach();
  return null;
}

export async function markTodo(key: string) {
  const uid = coachStore.get().auth?.user.id;
  coachStore.set((s) => ({ todoDone: new Set([...s.todoDone, key]) }));
  await sb.from('todo_done').upsert({ coach_id: uid, day: dayKey(Date.now()), key });
}

export async function setLeadStatus(id: string, status: 'new' | 'converted' | 'rejected') {
  const { error } = await sb.from('leads').update({ status }).eq('id', id);
  if (!error) coachStore.set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, status } : l)) }));
  return error?.message ?? null;
}

export async function saveProgram(p: { id?: string; name: string; days: ProgramDay[] }): Promise<string | null> {
  const uid = coachStore.get().auth?.user.id;
  const row = { name: p.name.trim() || '—', days: p.days };
  if (p.id) {
    const { error } = await sb.from('programs').update(row).eq('id', p.id);
    if (error) return null;
    coachStore.set((s) => ({ programs: s.programs.map((x) => (x.id === p.id ? { id: p.id!, ...row } : x)) }));
    return p.id;
  }
  const { data, error } = await sb.from('programs').insert({ ...row, coach_id: uid }).select('id').single();
  if (error) return null;
  coachStore.set((s) => ({ programs: [...s.programs, { id: data.id, ...row }] }));
  return data.id;
}

export async function deleteProgram(id: string) {
  const { error } = await sb.from('programs').delete().eq('id', id);
  if (!error) coachStore.set((s) => ({ programs: s.programs.filter((x) => x.id !== id), clients: s.clients.map((c) => (c.program_id === id ? { ...c, program_id: null } : c)) }));
  return error?.message ?? null;
}

export async function updateCoach(patch: Partial<Pick<Coach, 'name' | 'card' | 'phone' | 'instagram' | 'lang'>>) {
  const id = coachStore.get().coach?.id;
  if (!id) return 'no coach';
  const { error } = await sb.from('coaches').update(patch).eq('id', id);
  if (!error) coachStore.set((s) => ({ coach: s.coach ? { ...s.coach, ...patch } : s.coach }));
  return error?.message ?? null;
}

export async function photoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await sb.storage.from('report-photos').createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  (data ?? []).forEach((x) => { if (x.signedUrl && x.path) out[x.path] = x.signedUrl; });
  return out;
}
