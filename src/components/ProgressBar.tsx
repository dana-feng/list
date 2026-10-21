import { View } from 'react-native';
import { colors } from '@/theme';
import { useTint } from './Surface';

/** How much of a list is done. `outlined` is the pen-drawn bar with an olive fill. */
export function ProgressBar({ done, total, height = 8, outlined }: { done: number; total: number; height?: number; outlined?: boolean }) {
  const pct = total ? Math.round((100 * done) / total) : 0;
  const ink = useTint(colors.ink);
  const track = useTint(colors.inkTrack);
  return (
    <View
      accessibilityLabel={`${done} of ${total} done`}
      style={{
        flex: 1, height, borderRadius: height / 2, overflow: 'hidden',
        backgroundColor: outlined ? 'transparent' : track,
        borderWidth: outlined ? 1.2 : 0, borderColor: ink,
      }}
    >
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: height / 2, backgroundColor: outlined ? colors.olive : ink }} />
    </View>
  );
}
