import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
// One import per weight, so only these files ship with the app.
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDb } from '@/api/db';
import { startSync } from '@/api/sync';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();
startSync();

export default function RootLayout() {
  const db = useDb();
  const [loaded, error] = useFonts({
    BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
    IBMPlexMono_400Regular, IBMPlexMono_500Medium,
  });

  // Keep the splash up until fonts are in and we know whether you're signed in.
  const ready = (loaded || !!error) && db.status !== 'loading';
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night } }}>
        <Stack.Screen name="done/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="list/new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="item/new" options={{ animation: 'slide_from_bottom' }} />
        {/* iOS 26 goes back on a sideways drag anywhere, which would take drags meant for the tabs
            (SwipeTabs); on these, going back is from the left edge only */}
        <Stack.Screen name="user/[username]/index" options={{ fullScreenGestureEnabled: false }} />
        <Stack.Screen name="user/[username]/follows" options={{ fullScreenGestureEnabled: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
