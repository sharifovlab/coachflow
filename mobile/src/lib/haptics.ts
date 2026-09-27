// Haptics with a web no-op. selection = toggles, tap = light commit, set = set done, success = finish/PR.
import * as H from 'expo-haptics';
import { Platform } from 'react-native';

const on = Platform.OS !== 'web';
export const haptic = {
  selection: () => { if (on) H.selectionAsync().catch(() => {}); },
  tap: () => { if (on) H.impactAsync(H.ImpactFeedbackStyle.Light).catch(() => {}); },
  set: () => { if (on) H.impactAsync(H.ImpactFeedbackStyle.Medium).catch(() => {}); },
  heavy: () => { if (on) H.impactAsync(H.ImpactFeedbackStyle.Heavy).catch(() => {}); },
  success: () => { if (on) H.notificationAsync(H.NotificationFeedbackType.Success).catch(() => {}); },
  warning: () => { if (on) H.notificationAsync(H.NotificationFeedbackType.Warning).catch(() => {}); },
};
