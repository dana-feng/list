import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { colors, space } from '@/theme';
import { Icon } from './Icon';

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function BackButton({ color = colors.ink }: { color?: string }) {
  return (
    <Pressable onPress={goBack} hitSlop={14} accessibilityRole="button" accessibilityLabel="Back">
      <Icon name="back" size={26} color={color} strokeWidth={2.4} />
    </Pressable>
  );
}

/** Top row: something on the left (back arrow by default), optional middle, actions on the right. */
export function Header({ left, center, right }: { left?: ReactNode; center?: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>{left === undefined ? <BackButton /> : left}</View>
      <View style={styles.center}>{center}</View>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, minHeight: 44, marginBottom: space.md },
  side: { flexDirection: 'row', alignItems: 'center', gap: space.lg, flexShrink: 0 },
  center: { flex: 1, paddingHorizontal: space.md },
  right: { justifyContent: 'flex-end' },
});
