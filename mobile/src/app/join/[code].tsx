// Deep link coachflow://join/<code> → join screen with the code filled in.
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function JoinLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={{ pathname: '/join', params: { code: code ?? '' } }} />;
}
