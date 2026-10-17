// Push notifications on this phone. The database decides what buzzes and sends it (see the
// push_notifications migration and supabase/functions/push); this side only:
//   - asks for permission once you're signed in, and saves the phone's Expo push token
//   - forgets the token on sign-out, so the phone stops getting that account's pushes
//   - opens the right screen when a push is tapped (useOpenTappedPush, in the root layout)
//
// Needs a development build (not Expo Go) with an EAS project id, and on iOS an Apple
// developer account for the push key. Until then registerForPush() quietly does nothing.
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { supabase } from './supabase';

/** Matches CHANNEL in supabase/functions/push/message.ts. */
const ANDROID_CHANNEL = 'default';

// A push that arrives while the app is open still shows as a banner (the bell's dot is already
// live), but without a sound and never as a number on the icon.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let saved: { token: string; me: string } | null = null;

/** Asks for permission (the first time) and saves this phone's push token for `me`. Safe to call on every launch. */
export async function registerForPush(me: string) {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  if (saved?.me === me) return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    // set up with `eas init`; see the README's push notifications section
    console.warn('push notifications are off: no EAS project id in app.json');
    return;
  }

  try {
    if (Platform.OS === 'android') {
      // Android 13+ only shows the permission prompt once a channel exists
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: 'Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    if (!allowed(permission) && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      });
    }
    if (!allowed(permission)) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { error } = await supabase.rpc('save_push_token', {
      p_token: token,
      p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
      p_time_zone: timeZone,
    });
    if (error) {
      console.warn("couldn't save push token", error.message);
      return;
    }
    saved = { token, me };
  } catch (e) {
    // offline, or Expo's servers didn't answer: try again next launch
    console.warn("couldn't set up push notifications", e instanceof Error ? e.message : String(e));
  }
}

/** Call before signing out, while still signed in. */
export async function forgetPushToken() {
  if (!saved) return;
  const { token } = saved;
  saved = null;
  const { error } = await supabase.rpc('forget_push_token', { p_token: token });
  if (error) console.warn("couldn't forget push token", error.message);
}

function allowed(p: Notifications.NotificationPermissionsStatus) {
  if (Platform.OS === 'ios') {
    const s = p.ios?.status;
    return s === Notifications.IosAuthorizationStatus.AUTHORIZED
      || s === Notifications.IosAuthorizationStatus.PROVISIONAL
      || s === Notifications.IosAuthorizationStatus.EPHEMERAL;
  }
  return p.granted;
}

/** Opens what a tapped push points at, including the push that launched the app. Only once you're signed in. */
// (no pushes on web, where expo-notifications can't read the last response at all)
export const useOpenTappedPush: (ready: boolean) => void = Platform.OS === 'web' ? () => {} : useOpenTappedPushOnPhone;

function useOpenTappedPushOnPhone(ready: boolean) {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
  }, [ready, response]);
}
