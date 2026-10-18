import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme';
import { Button, LinkText } from './Button';
import { Paper } from './Paper';
import { Hand, Mono } from './Text';

type Props = { title: string; count: string; onCard: () => void; onLater: () => void };

/**
 * "you did it!" after crossing something off. The post already went out;
 * "add photos + people" opens the done screen (photos, and who you did it with), "not now" just closes this.
 */
export function DoneSheet({ title, count, onCard, onLater }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(82,23,9,0.6)' }]} onPress={onLater} accessibilityRole="button" accessibilityLabel="Not now" />
      <Paper fill={colors.bark} edge="light" shape={5} round={1.7} style={[styles.card, { bottom: insets.bottom + 16 }]} accessibilityLabel="You did it">
        <Svg width={56} height={22} viewBox="0 0 60 24" accessibilityElementsHidden>
          <Path d="M3 17 Q 9 6 8 15 Q 7 24 14 15 Q 21 6 19 15 Q 17 24 24 15 Q 31 6 29 15 Q 27 24 34 15 Q 41 6 39 15 Q 37 24 44 15 Q 51 6 49 15 Q 47 24 55 14" fill="none" stroke={colors.paper} strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
        <View style={{ gap: 4 }}>
          <Mono size={11} color={colors.onDarkSoft} style={{ letterSpacing: 1.5 }}>done · {count}</Mono>
          <Hand size={30} color={colors.paper} style={{ lineHeight: 32 }} accessibilityLiveRegion="polite">you did it!</Hand>
          <Hand size={18} color={colors.paper} style={{ opacity: 0.92 }}>{title}</Hand>
        </View>
        <View style={{ gap: 4 }}>
          <Button label="add photos + people" tone="paper" onPress={onCard} style={{ height: 48 }} />
          <View style={{ alignItems: 'center' }}>
            <LinkText label="not now" color={colors.paper} onPress={onLater} />
          </View>
        </View>
      </Paper>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', left: 12, right: 12, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 14, gap: 14 },
});
