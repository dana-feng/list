import { useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { ConfirmCard } from './ConfirmDialog';
import { Icon } from './Icon';
import { Paper } from './Paper';
import { MonoMedium } from './Text';
import { Surface } from './Surface';

export type MoreAction = {
  label: string;
  onPress: () => void;
  /** Deleting and the like: asks first, in a popup ("delete item?"). */
  confirm?: boolean;
  /** The question, when "<label>?" isn't enough: "block @dana?" */
  confirmTitle?: string;
  /** Under the question, for when it's worth spelling out what happens. */
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
          <Surface tone="light">
          {/* asking first: the menu gives way to the "are you sure?" card, in the same popup */}
          {confirming ? (
            <ConfirmCard
              title={confirming.confirmTitle ?? `${confirming.label}?`}
              body={confirming.confirmText}
              action={confirming.label}
              onConfirm={() => run(confirming)}
              onCancel={close}
            />
          ) : (
            <>
              <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close menu" />
              <Paper fill={colors.cream} edge="ink" shape={3} style={[styles.menu, { top: insets.top + 50 }]}>
                {actions.map((a) => {
                  const tone = (a.danger ?? a.confirm) ? colors.bark : colors.ink;
                  return (
                    <Pressable key={a.label} onPress={() => run(a)} style={styles.item} accessibilityRole="button">
                      <MonoMedium size={13} color={tone}>{a.label}</MonoMedium>
                    </Pressable>
                  );
                })}
              </Paper>
            </>
          )}
          </Surface>
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
