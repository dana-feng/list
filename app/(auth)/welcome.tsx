import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Logo, Swoosh } from '@/components/Logo';
import { Surface } from '@/components/Surface';
import { Hand } from '@/components/Text';
import { colors, fonts } from '@/theme';

/** The landing page, always in the light look: "echi" over the olive logo, with the sage paint stroke behind it, on almost white. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  return (
    <Surface fill={colors.almostWhite}>
      <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        <StatusBar style="dark" />
        <View style={styles.middle}>
          <View style={styles.mark} accessibilityRole="header" accessibilityLabel="echi">
            <View style={styles.swoosh} pointerEvents="none"><Swoosh width={180} look="sage" /></View>
            <Hand size={32} color={colors.night} style={styles.word}>echi</Hand>
            <Logo size={220} look="olive" />
          </View>
        </View>
        <Button label="get started" onPress={() => router.push('/phone')} />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20, backgroundColor: colors.almostWhite },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 260, height: 300, alignItems: 'center', justifyContent: 'center' },
  // the stroke stands upright behind the papers, as drawn: its top by the word, its tail out below on the left
  swoosh: { position: 'absolute', top: 70, left: 50 },
  word: { fontFamily: fonts.hand, lineHeight: 42, marginBottom: -2, zIndex: 1 },
});
