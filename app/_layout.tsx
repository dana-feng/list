import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDb } from '@/api/db';
import { startSync } from '@/api/sync';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();
startSync();

export default function RootLayout() {
  const db = useDb();
  const [loaded, error] = useFonts({
    Fraunces_600SemiBold, Fraunces_700Bold,
    InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold,
    DMMono_400Regular, DMMono_500Medium,
  });

  // Keep the splash up until fonts are in and we know whether you're signed in.
  const ready = (loaded || !!error) && db.status !== 'loading';
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.sageMid } }}>
        <Stack.Screen name="done/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="list/new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="item/new" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
