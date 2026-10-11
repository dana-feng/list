import { Pressable, View } from 'react-native';
import { colors } from '@/theme';
import { Icon } from './Icon';

/** The square you tick to mark done. */
export function Checkbox({ checked, onPress, size = 24, onDark, label }: { checked: boolean; onPress?: () => void; size?: number; onDark?: boolean; label?: string }) {
  const edge = onDark ? colors.onDark : colors.ink;
  const box = (
      <View
        style={{
          width: size, height: size, borderRadius: size * 0.26, borderWidth: 2, borderColor: checked && !onDark ? colors.dark : edge,
          backgroundColor: checked ? (onDark ? colors.onDark : colors.dark) : 'transparent', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {checked ? <Icon name="check" size={size * 0.62} color={onDark ? colors.dark : colors.onDark} strokeWidth={3} /> : null}
      </View>
  );
  // decorative when there's nothing to tap, so it can sit inside another button
  if (!onPress) return box;
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label}>
      {box}
    </Pressable>
  );
}
