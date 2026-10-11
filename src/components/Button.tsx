import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { colors } from '@/theme';
import { SansBold } from './Text';

/** The full-width button pinned to the bottom of sign-up, pickers and "you did it". */
export function Button({ label, onPress, tone = 'dark', disabled, style }: { label: string; onPress: () => void; tone?: 'dark' | 'gold'; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[{ height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tone === 'gold' ? colors.gold : colors.dark, opacity: disabled ? 0.45 : 1 }, style]}
    >
      <SansBold size={17} color={tone === 'gold' ? colors.ink : colors.onDark}>{label}</SansBold>
    </Pressable>
  );
}
