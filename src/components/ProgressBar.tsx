import { View } from 'react-native';
import { colors } from '@/theme';

/** One small segment per thing, filled when done. */
export function ProgressBar({ done, total, tone = 'dark', height = 7 }: { done: number; total: number; tone?: 'dark' | 'gold'; height?: number }) {
  const filled = tone === 'gold' ? colors.gold : colors.dark;
  const empty = tone === 'gold' ? 'rgba(247,242,227,0.22)' : colors.pip;
  return (
    <View style={{ flexDirection: 'row', gap: 3 }} accessibilityLabel={`${done} of ${total} done`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height, borderRadius: height / 2, backgroundColor: i < done ? filled : empty }} />
      ))}
    </View>
  );
}
