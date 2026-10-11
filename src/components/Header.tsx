import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/theme';
import { Icon } from './Icon';
import { Paper } from './Paper';
import { Hand, Mono, MonoMedium } from './Text';

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function BackButton({ label = 'Back', onPress = goBack, icon = 'back' }: { label?: string; onPress?: () => void; icon?: 'back' | 'x' }) {
  return (
    <Pressable onPress={onPress} style={styles.icon} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={22} color={colors.paper} strokeWidth={1.9} />
    </Pressable>
  );
}

/** Top row on the dark background: left (back arrow by default), a handwritten title, actions on the right. */
export function Header({ left, title, center, right }: { left?: ReactNode; title?: string; center?: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={[styles.side, { justifyContent: 'flex-start' }]}>{left === undefined ? <BackButton /> : left}</View>
      <View style={styles.center}>{title ? <Hand size={20} color={colors.paper} numberOfLines={1}>{title}</Hand> : center}</View>
      <View style={[styles.side, { justifyContent: 'flex-end' }]}>{right}</View>
    </View>
  );
}

/** Plain cream text action in the header: "cancel", "edit". */
export function TextAction({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} style={[styles.text, { opacity: disabled ? 0.4 : 1 }]} accessibilityRole="button">
      <Mono size={13} color={colors.paper}>{label}</Mono>
    </Pressable>
  );
}

/** The filled paper action in the header: "save". */
export function SaveAction({ label = 'save', onPress, disabled }: { label?: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Paper onPress={onPress} disabled={disabled} fill={colors.paper} shape={1} round={1.2} accessibilityState={{ disabled }} style={{ height: 40, paddingHorizontal: 16, justifyContent: 'center', opacity: disabled ? 0.45 : 1 }}>
      <MonoMedium size={13}>{label}</MonoMedium>
    </Paper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 12 },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  center: { flexShrink: 1, alignItems: 'center' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  text: { height: 44, paddingHorizontal: 10, justifyContent: 'center' },
});
