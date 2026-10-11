import { View } from 'react-native';
import { colors } from '@/theme';

/** How much of a list is done. `outlined` is the pen-drawn bar with an olive fill. */
export function ProgressBar({ done, total, height = 8, outlined }: { done: number; total: number; height?: number; outlined?: boolean }) {
  const pct = total ? Math.round((100 * done) / total) : 0;
  return (
    <View
      accessibilityLabel={`${done} of ${total} done`}
      style={{
        flex: 1, height, borderRadius: height / 2, overflow: 'hidden',
        backgroundColor: outlined ? 'transparent' : colors.inkTrack,
        borderWidth: outlined ? 1.2 : 0, borderColor: colors.ink,
      }}
    >
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: height / 2, backgroundColor: outlined ? colors.olive : colors.ink }} />
    </View>
  );
}
