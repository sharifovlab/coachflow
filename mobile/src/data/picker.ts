// Hand-off between a screen and the exercise picker route.
import { router } from 'expo-router';
import type { Muscle } from '@/features/muscles';

type Req = { muscle?: Muscle | null; onPick: (exId: string) => void; allowCustom?: boolean };
let current: Req | null = null;

export function openPicker(req: Req) {
  current = req;
  router.push('/exercise-picker');
}
export function pickerRequest(): Req | null {
  return current;
}
export function completePick(exId: string) {
  const r = current;
  current = null;
  r?.onPick(exId);
}
