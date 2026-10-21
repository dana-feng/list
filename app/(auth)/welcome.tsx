import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Logo, Swoosh } from '@/components/Logo';
import { useScheme } from '@/components/Surface';
import { Hand, Mono } from '@/components/Text';
import { colors, fonts } from '@/theme';

/** The landing page from the sheet: the logo over a paint stroke, "echi" tipped across the top. Olive on sage in light mode, sage on sun in dark. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const scheme = useScheme();
  return (
    <View style={[styles.page, { backgroundColor: scheme.ground, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style={scheme.ground === colors.night ? 'light' : 'dark'} />
      <View style={styles.middle}>
        <View style={styles.mark} accessibilityRole="header" accessibilityLabel="echi">
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.swoosh}><Swoosh width={150} /></View>
          </View>
          <Hand size={44} style={styles.word}>echi</Hand>
          <Logo size={180} />
        </View>
        <Mono size={13} center color={colors.inkSoft} style={styles.tagline}>
          lists of things to do, shared with the people you’d do them with.
        </Mono>
      </View>
      <Button label="get started" onPress={() => router.push('/phone')} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  mark: { width: 230, height: 230, alignItems: 'center', justifyContent: 'center' },
  swoosh: { position: 'absolute', left: 10, top: 6 },
  word: { fontFamily: fonts.hand, lineHeight: 60, marginBottom: -12, marginLeft: -40, zIndex: 1, transform: [{ rotate: '-14deg' }] },
  tagline: { maxWidth: 280, lineHeight: 20 },
});
