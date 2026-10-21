import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
// One import per weight, so only these files ship with the app.
import { Cousine_400Regular } from '@expo-google-fonts/cousine/400Regular';
import { Cousine_700Bold } from '@expo-google-fonts/cousine/700Bold';
import { NotoSerifMalayalam_700Bold } from '@expo-google-fonts/noto-serif-malayalam/700Bold';
import { NotoSerifMalayalam_800ExtraBold } from '@expo-google-fonts/noto-serif-malayalam/800ExtraBold';
import { NotoSerifMalayalam_900Black } from '@expo-google-fonts/noto-serif-malayalam/900Black';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDb } from '@/api/db';
import { registerForPush, useOpenTappedPush } from '@/api/push';
import { startSync } from '@/api/sync';
import { SCHEMES } from '@/theme';
import { GroundSurface, useScheme } from '@/components/Surface';

SplashScreen.preventAutoHideAsync();
startSync();

export default function RootLayout() {
  const db = useDb();
  const scheme = useScheme();
  const [loaded, error] = useFonts({
    NotoSerifMalayalam_700Bold, NotoSerifMalayalam_800ExtraBold, NotoSerifMalayalam_900Black,
    Cousine_400Regular, Cousine_700Bold,
  });

  // Keep the splash up until fonts are in and we know whether you're signed in.
  const ready = (loaded || !!error) && db.status !== 'loading';
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Push: ask once you're in (a no-op until push is set up; see src/api/push.ts), and open
  // whatever a tapped push points at.
  const signedIn = db.status === 'ready';
  useEffect(() => {
    if (signedIn && db.me) registerForPush(db.me);
  }, [signedIn, db.me]);
  useOpenTappedPush(ready && signedIn);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <GroundSurface>
      <StatusBar style={scheme === SCHEMES.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: scheme.ground } }}>
        <Stack.Screen name="done/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="list/new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="item/new" options={{ animation: 'slide_from_bottom' }} />
        {/* just the comments sheet (it slides itself up), over the screen you came from */}
        <Stack.Screen name="post/[id]" options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
        {/* iOS 26 goes back on a sideways drag anywhere, which would take drags meant for the tabs
            (SwipeTabs); on these, going back is from the left edge only */}
        <Stack.Screen name="user/[username]/index" options={{ fullScreenGestureEnabled: false }} />
        <Stack.Screen name="user/[username]/follows" options={{ fullScreenGestureEnabled: false }} />
      </Stack>
      </GroundSurface>
    </SafeAreaProvider>
  );
}
