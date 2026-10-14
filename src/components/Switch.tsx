import { Pressable, View } from 'react-native';
import { colors } from '@/theme';
import { Mono } from './Text';

/** A hand-drawn on/off switch with what it means next to it, or under it with `stacked`. */
export function Switch({ on, onPress, label, text, stacked }: { on: boolean; onPress: () => void; label: string; text?: string; stacked?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} style={{ flexDirection: stacked ? 'column' : 'row', alignItems: 'center', gap: stacked ? 3 : 8, minHeight: 32, maxWidth: '100%' }}>
      <View
        style={{
          width: 46, height: 26, borderRadius: 13, borderTopLeftRadius: 13, borderTopRightRadius: 14, borderBottomRightRadius: 13, borderBottomLeftRadius: 12,
          backgroundColor: on ? colors.olive : colors.straw, borderWidth: 1.3, borderColor: colors.ink, justifyContent: 'center',
        }}
      >
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.ink, marginLeft: on ? 22 : 3 }} />
      </View>
      {text ? <Mono size={stacked ? 10.5 : 11.5} style={{ flexShrink: 1 }}>{text}</Mono> : null}
    </Pressable>
  );
}
