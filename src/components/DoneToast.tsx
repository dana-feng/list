import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';
import { Sans, SansBold } from './Text';

type Props = { title: string; onAddPics: () => void; onUndo: () => void; onLater: () => void };

/** "Done: …" with Add pics / Undo / Later. The post already went out; Later just leaves it without photos. */
export function DoneToast({ title, onAddPics, onUndo, onLater }: Props) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const t = setTimeout(onLater, 8000);
    return () => clearTimeout(t);
  }, [title]);
  return (
    <View style={[styles.toast, { bottom: insets.bottom + space.lg }]} accessibilityLiveRegion="polite">
      <Sans color={colors.onDark} numberOfLines={1}>
        <SansBold color={colors.onDark}>Done: </SansBold>
        {title}
      </Sans>
      <View style={styles.actions}>
        <Pressable onPress={onAddPics} style={[styles.action, { backgroundColor: colors.gold }]} accessibilityRole="button">
          <SansBold size={14}>Add pics</SansBold>
        </Pressable>
        <Pressable onPress={onUndo} style={styles.action} accessibilityRole="button">
          <SansBold size={14} color={colors.onDark}>Undo</SansBold>
        </Pressable>
        <Pressable onPress={onLater} style={styles.action} accessibilityRole="button">
          <Sans size={14} color={colors.onDarkSoft}>Later</Sans>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: space.lg, right: space.lg, backgroundColor: colors.dark, borderRadius: 16, padding: space.lg,
    shadowColor: '#1B2414', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  action: { paddingHorizontal: 14, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
