import { View } from 'react-native';
import { colors, space } from '@/theme';

/** Dotted rule between sections of a card. */
export function Dots({ gap = space.lg }: { gap?: number }) {
  return <View style={{ borderBottomWidth: 1.5, borderStyle: 'dotted', borderColor: colors.line, marginVertical: gap }} />;
}
