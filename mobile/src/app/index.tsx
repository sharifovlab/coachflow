// Entry: send the user to their home by role.
import { Redirect } from 'expo-router';
import { clientStore } from '@/data/client';
import { coachStore } from '@/data/coach';
import { settings } from '@/data/settings';

export default function Index() {
  const role = settings.get().role;
  if (role === 'client' && clientStore.get().token) return <Redirect href="/client" />;
  if (role === 'coach' && coachStore.get().auth) return <Redirect href="/coach" />;
  return <Redirect href="/welcome" />;
}
