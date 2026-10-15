import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { Hand } from './Text';

type Props = {
  title: string;
  /** Tapping outside, the back gesture and the footer's button all end up here. */
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the scrolling part: "done", and anything that goes with it. */
  footer?: ReactNode;
};

/**
 * A sheet that slides up from the bottom over a dimmed screen. Render it only while it's open.
 * There's no cancel: whatever was picked counts, however the sheet goes away.
 */
export function Sheet({ title, onClose, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottom} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: 14 + insets.bottom }]} accessibilityViewIsModal accessibilityLabel={title}>
          <View style={styles.handle} />
          <Hand size={24} style={{ marginBottom: 12 }}>{title}</Hand>
          <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer ? <View style={{ marginTop: 14 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFill, backgroundColor: colors.dim },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%', backgroundColor: colors.paper, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: colors.ink,
    borderTopLeftRadius: 22, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.rule, marginBottom: 12 },
});
