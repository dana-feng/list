import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { Icon } from './Icon';
import { Paper } from './Paper';
import { Mono, MonoMedium } from './Text';

export type MoreAction = {
  label: string;
  onPress: () => void;
  /** Deleting and the like: asks "are you sure?" in the menu before doing it. */
  confirm?: boolean;
  /** Said instead of "are you sure?", for when it's worth spelling out what happens. */
  confirmText?: string;
  /** In red, like delete; on by default for anything that asks first. */
  danger?: boolean;
};

/** The ⋯ in the header: a small menu of the things you do rarely (settings, delete). */
export function MoreMenu({ actions, label = 'More' }: { actions: MoreAction[]; label?: string }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<MoreAction | null>(null);
  const close = () => {
    setOpen(false);
    setConfirming(null);
  };
  const run = (a: MoreAction) => {
    if (a.confirm && confirming !== a) return setConfirming(a);
    close();
    a.onPress();
  };
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.button} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }}>
        <Icon name="more" size={24} color={colors.paper} />
      </Pressable>
      {open ? (
        <Modal visible transparent animationType="fade" onRequestClose={close}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close menu" />
          <Paper fill={colors.cream} edge="ink" shape={3} style={[styles.menu, { top: insets.top + 50 }]}>
            {confirming ? (
              <View style={{ padding: 8, gap: 4 }}>
                <Mono size={12} color={colors.inkSoft} style={{ maxWidth: 240, lineHeight: 18 }}>{confirming.confirmText ?? `${confirming.label}: are you sure?`}</Mono>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable onPress={() => run(confirming)} style={styles.item} accessibilityRole="button">
                    <MonoMedium size={13} color={colors.bark} style={{ textDecorationLine: 'underline' }}>yes</MonoMedium>
                  </Pressable>
                  <Pressable onPress={() => setConfirming(null)} style={styles.item} accessibilityRole="button">
                    <MonoMedium size={13}>no</MonoMedium>
                  </Pressable>
                </View>
              </View>
            ) : (
              actions.map((a) => {
                const tone = (a.danger ?? a.confirm) ? colors.bark : colors.ink;
                return (
                  <Pressable key={a.label} onPress={() => run(a)} style={styles.item} accessibilityRole="button">
                    <MonoMedium size={13} color={tone}>{a.label}</MonoMedium>
                  </Pressable>
                );
              })
            )}
          </Paper>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  menu: {
    position: 'absolute', right: 16, minWidth: 190, padding: 6,
    shadowColor: '#3A1000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  item: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
});
