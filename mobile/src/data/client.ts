// Client data: token, cached server view, offline queue of workouts, the active workout.
// Offline-first: everything the client does is written locally first, then synced with client_save_session.
import { normalizeProgram } from '@/features/program';
import type { PlanItem, Program, Session, SetLog, WeightEntry } from '@/features/types';
import { createStore, useStore } from './store';
import { getJSON, getSecret, setJSON, setSecret } from './storage';
import { PHOTO_BUCKET, sb, uuid } from './supabase';

export type ClientInfo = {
  id: string; name: string; lang: 'az' | 'ru'; goal: string;
  billing_type: 'monthly' | 'package' | 'installment'; price: number; months: number; parts: number; parts_paid: number;
  next_payment: string | null; check_day: number;
};
export type CoachInfo = { name: string; card: string; phone: string; instagram: string };
export type MealInfo = { name: string; items: { s: string; f: string; g: number }[] } | null;

export type ServerView = {
  client: ClientInfo;
  coach: CoachInfo;
  program: Program | null;
  meal: MealInfo;
  sessions: Session[];
  sets: SetLog[];
  weights: WeightEntry[];
  fetchedAt: number;
};

/** A finished workout waiting to be saved on the server. */
export type Pending = { session: Session & { programId: string | null }; sets: SetLog[] };

export type Active = {
  id: string;
  programId: string | null;
  dayId: string | null;
  dayName: string;
  startedAt: number;
  items: PlanItem[];
  cur: number;
  sets: SetLog[];
  restUntil: number | null;
  restTotal: number;
};

type ClientState = {
  token: string | null;
  view: ServerView | null;
  pending: Pending[];
  active: Active | null;
  syncing: boolean;
  online: boolean;
  loaded: boolean;
};

export const clientStore = createStore<ClientState>({
  token: null, view: null, pending: [], active: null, syncing: false, online: true, loaded: false,
});

const K = { token: 'cf.client.token', view: 'cf.client.view', pending: 'cf.client.pending', active: 'cf.client.active' };

export async function loadClient() {
  const [token, view, pending, active] = await Promise.all([
    getSecret(K.token), getJSON<ServerView>(K.view), getJSON<Pending[]>(K.pending), getJSON<Active>(K.active),
  ]);
  clientStore.set({ token, view, pending: pending ?? [], active, loaded: true });
}

// ---------- server calls ----------

function parseView(raw: any): ServerView {
  const sessions: Session[] = (raw.sessions ?? []).map((s: any) => ({
    id: s.id, dayId: s.day_id ?? null, dayName: s.day_name ?? '',
    startedAt: Date.parse(s.started_at), finishedAt: s.finished_at ? Date.parse(s.finished_at) : null, feel: s.feel ?? null,
  }));
  const sets: SetLog[] = (raw.sets ?? []).map((a: any[]) => ({
    sid: a[0], ex: a[1], order: a[2], i: a[3], w: a[4] == null ? null : Number(a[4]), r: a[5], at: Date.parse(a[6]),
  }));
  const c = raw.client;
  return {
    client: { ...c, price: Number(c.price) },
    coach: raw.coach,
    program: normalizeProgram(raw.program),
    meal: raw.meal ?? null,
    sessions,
    sets,
    weights: (raw.weights ?? []).map((w: any) => ({ d: w.d, kg: w.kg == null ? null : Number(w.kg), note: w.note ?? '', photo: !!w.photo })),
    fetchedAt: Date.now(),
  };
}

export type ClaimResult = { ok: true; name: string; coach: string; lang: 'az' | 'ru' } | { ok: false; reason: 'code' | 'network' | 'limit' };

export async function claim(code: string): Promise<ClaimResult> {
  const { data, error } = await sb.rpc('client_claim', { p_code: code });
  if (error) return { ok: false, reason: /too many/.test(error.message) ? 'limit' : 'network' };
  if (!data) return { ok: false, reason: 'code' };
  await setSecret(K.token, data.token);
  clientStore.set({ token: data.token });
  await refresh();
  return { ok: true, name: data.name, coach: data.coach, lang: data.lang };
}

export async function refresh(): Promise<boolean> {
  const token = clientStore.get().token;
  if (!token) return false;
  await sync();
  const { data, error } = await sb.rpc('client_app_view', { p_token: token });
  if (error) {
    clientStore.set({ online: false });
    return false;
  }
  if (!data) {
    // Token no longer valid (coach removed the client).
    await leave();
    return false;
  }
  const view = parseView(data);
  clientStore.set({ view, online: true });
  await setJSON(K.view, view);
  return true;
}

function toPayload(p: Pending) {
  const s = p.session;
  return {
    id: s.id, program_id: s.programId, day_id: s.dayId, day_name: s.dayName,
    started_at: new Date(s.startedAt).toISOString(),
    finished_at: s.finishedAt ? new Date(s.finishedAt).toISOString() : null,
    feel: s.feel, note: '',
    sets: p.sets.map((x) => ({ ex: x.ex, order: x.order, i: x.i, w: x.w, r: x.r, at: new Date(x.at).toISOString() })),
  };
}

export async function sync(): Promise<void> {
  const { token, pending, syncing } = clientStore.get();
  if (!token || syncing || pending.length === 0) return;
  clientStore.set({ syncing: true });
  try {
    for (const p of pending) {
      const { error } = await sb.rpc('client_save_session', { p_token: token, p_session: toPayload(p) });
      if (error) {
        clientStore.set({ online: !/fetch|network/i.test(error.message) });
        break;
      }
      mergeIntoView(p);
      const rest = clientStore.get().pending.filter((x) => x.session.id !== p.session.id);
      clientStore.set({ pending: rest, online: true });
      await setJSON(K.pending, rest);
    }
  } finally {
    clientStore.set({ syncing: false });
  }
}

function mergeIntoView(p: Pending) {
  const v = clientStore.get().view;
  if (!v) return;
  const { programId: _pid, ...session } = p.session;
  const sessions = [...v.sessions.filter((s) => s.id !== session.id), session].sort((a, b) => a.startedAt - b.startedAt);
  const sets = [...v.sets.filter((s) => s.sid !== session.id), ...p.sets].sort((a, b) => a.at - b.at);
  const view = { ...v, sessions, sets };
  clientStore.set({ view });
  setJSON(K.view, view);
}

export async function leave() {
  await setSecret(K.token, null);
  await Promise.all([setJSON(K.view, null), setJSON(K.pending, null), setJSON(K.active, null)]);
  clientStore.set({ token: null, view: null, pending: [], active: null });
}

// ---------- merged data for screens ----------

export type ClientData = {
  view: ServerView | null;
  sessions: Session[];
  sets: SetLog[];
  pendingIds: Set<string>;
};

let cacheKey: unknown[] = [];
let cacheVal: ClientData | null = null;
function merged(s: ClientState): ClientData {
  if (cacheVal && cacheKey[0] === s.view && cacheKey[1] === s.pending) return cacheVal;
  const pendingIds = new Set(s.pending.map((p) => p.session.id));
  const sessions = [...(s.view?.sessions ?? []).filter((x) => !pendingIds.has(x.id)), ...s.pending.map((p) => { const { programId: _p, ...x } = p.session; return x; })]
    .sort((a, b) => a.startedAt - b.startedAt);
  const sets = [...(s.view?.sets ?? []).filter((x) => !pendingIds.has(x.sid)), ...s.pending.flatMap((p) => p.sets)].sort((a, b) => a.at - b.at);
  cacheKey = [s.view, s.pending];
  cacheVal = { view: s.view, sessions, sets, pendingIds };
  return cacheVal;
}

export const useClientData = () => useStore(clientStore, merged);
export const useActive = () => useStore(clientStore, (s) => s.active);
export const useClientStatus = () => useStore(clientStore, (s) => ({ syncing: s.syncing, online: s.online, pending: s.pending.length }));

// ---------- active workout ----------

function saveActive(a: Active | null) {
  clientStore.set({ active: a });
  setJSON(K.active, a);
}

export function startWorkout(opts: { programId: string | null; dayId: string | null; dayName: string; items: PlanItem[] }) {
  const cur = clientStore.get().active;
  if (cur) return cur;
  const a: Active = { id: uuid(), ...opts, startedAt: Date.now(), cur: 0, sets: [], restUntil: null, restTotal: 0 };
  saveActive(a);
  return a;
}

export function updateActive(fn: (a: Active) => Active) {
  const a = clientStore.get().active;
  if (a) saveActive(fn(a));
}

export function logSet(w: number | null, r: number) {
  updateActive((a) => {
    const it = a.items[a.cur];
    const i = a.sets.filter((s) => s.ex === it.ex && s.order === a.cur).length;
    const at = Date.now();
    const set: SetLog = { sid: a.id, ex: it.ex, order: a.cur, i, w, r, at };
    return { ...a, sets: [...a.sets, set], restUntil: at + it.rest * 1000, restTotal: it.rest };
  });
}

export function undoLastSet() {
  updateActive((a) => ({ ...a, sets: a.sets.slice(0, -1), restUntil: null }));
}

export function finishWorkout(): string | null {
  const a = clientStore.get().active;
  if (!a) return null;
  if (a.sets.length === 0) {
    saveActive(null);
    return null;
  }
  const p: Pending = {
    session: { id: a.id, programId: a.programId, dayId: a.dayId, dayName: a.dayName, startedAt: a.startedAt, finishedAt: Date.now(), feel: null },
    sets: a.sets,
  };
  const pending = [...clientStore.get().pending, p];
  clientStore.set({ pending });
  setJSON(K.pending, pending);
  saveActive(null);
  sync();
  return a.id;
}

export function discardWorkout() {
  saveActive(null);
}

/** Set how the workout felt (1–5). Works for pending and already-synced sessions. */
export function setFeel(id: string, feel: number) {
  const s = clientStore.get();
  const inPending = s.pending.find((p) => p.session.id === id);
  if (inPending) {
    const pending = s.pending.map((p) => (p.session.id === id ? { ...p, session: { ...p.session, feel } } : p));
    clientStore.set({ pending });
    setJSON(K.pending, pending);
    sync();
    return;
  }
  const v = s.view;
  const sess = v?.sessions.find((x) => x.id === id);
  if (!v || !sess) return;
  const p: Pending = { session: { ...sess, feel, programId: v.program?.id ?? null }, sets: v.sets.filter((x) => x.sid === id) };
  const pending = [...s.pending, p];
  clientStore.set({ pending });
  setJSON(K.pending, pending);
  sync();
}

// ---------- weekly report (weight, note, photo) ----------

export async function submitReport(weight: number | null, note: string, photo: { uri: string; mime?: string } | null): Promise<'ok' | 'photo' | 'error'> {
  const token = clientStore.get().token;
  if (!token) return 'error';
  let path: string | null = null;
  let photoFailed = false;
  if (photo) {
    try {
      const buf = await (await fetch(photo.uri)).arrayBuffer();
      const p = `${token}/${uuid()}.jpg`;
      const up = await sb.storage.from(PHOTO_BUCKET).upload(p, buf, { contentType: photo.mime ?? 'image/jpeg' });
      if (up.error) photoFailed = true;
      else path = p;
    } catch {
      photoFailed = true;
    }
  }
  const { error } = await sb.rpc('client_submit_report', { p_token: token, p_weight: weight, p_note: note, p_photo: path });
  if (error) return 'error';
  await refresh();
  return photoFailed ? 'photo' : 'ok';
}
