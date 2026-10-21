import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Logo, Swoosh } from '@/components/Logo';
import { Surface } from '@/components/Surface';
import { Hand } from '@/components/Text';
import { fonts, SCHEMES } from '@/theme';

/** The landing page from the sheet, always in the light look: the olive logo over the sun paint stroke on sage, "echi" tipped across the top. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const light = SCHEMES.light;
  return (
    <Surface fill={light.ground}>
    <View style={[styles.page, { backgroundColor: light.ground, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style="dark" />
      <View style={styles.middle}>
        <View style={styles.mark} accessibilityRole="header" accessibilityLabel="echi">
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.swoosh}><Swoosh width={150} look={light.swoosh} /></View>
          </View>
          <Hand size={44} style={styles.word}>echi</Hand>
          <Logo size={180} look={light.logo} />
        </View>
      </View>
      <Button label="get started" onPress={() => router.push('/phone')} />
    </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  mark: { width: 230, height: 230, alignItems: 'center', justifyContent: 'center' },
  swoosh: { position: 'absolute', left: 10, top: 6 },
  word: { fontFamily: fonts.hand, lineHeight: 60, marginBottom: -12, marginLeft: -40, zIndex: 1, transform: [{ rotate: '-14deg' }] },
});
