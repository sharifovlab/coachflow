// App-wide settings: interface language and which role this phone is signed in as.
import { createStore, useStore } from './store';
import { getJSON, setJSON } from './storage';
import type { Lang } from '@/features/format';

export type Role = 'client' | 'coach' | null;
type Settings = { lang: Lang; role: Role; ready: boolean };

export const settings = createStore<Settings>({ lang: 'ru', role: null, ready: false });
const KEY = 'cf.settings';

export async function loadSettings() {
  const s = await getJSON<Partial<Settings>>(KEY);
  settings.set({ lang: s?.lang === 'az' ? 'az' : 'ru', role: s?.role ?? null, ready: true });
}

function persist() {
  const { lang, role } = settings.get();
  setJSON(KEY, { lang, role });
}

export function setLang(lang: Lang) {
  settings.set({ lang });
  persist();
}
export function setRole(role: Role) {
  settings.set({ role });
  persist();
}

export const useLang = () => useStore(settings, (s) => s.lang);
export const useRole = () => useStore(settings, (s) => s.role);
