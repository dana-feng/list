// Taps from the phone. Android gets its own haptics engine where there's a match; web gets nothing.
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** A small, crisp tap: liking, sending, toggling something back off. */
export function tap() {
  if (Platform.OS === 'android') Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key);
  else if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Something got done: crossing an item off. */
export function success() {
  if (Platform.OS === 'android') Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
  else if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Saying yes or no, or taking something back: a toggle switching on or off. */
export function toggle(on: boolean) {
  if (Platform.OS === 'android') Haptics.performAndroidHapticsAsync(on ? Haptics.AndroidHaptics.Toggle_On : Haptics.AndroidHaptics.Toggle_Off);
  else if (Platform.OS !== 'web') Haptics.impactAsync(on ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
}

/** A press-and-hold that brings something up. */
export function hold() {
  if (Platform.OS === 'android') Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press);
  else if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** A row passing another while you drag it, and settling where it's dropped. */
export function tick() {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
}
