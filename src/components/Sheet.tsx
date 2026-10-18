import { ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { useDragToClose } from './dragToClose';
import { Hand } from './Text';

type Props = {
  /** The heading. Leave it out when what's in the sheet speaks for itself. */
  title?: string;
  /** Tapping outside, dragging it down, the back gesture and the footer's button all end up here. */
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the scrolling part: "done", and anything that goes with it. */
  footer?: ReactNode;
  /** Shown over the whole sheet and the dimmed screen, like a ConfirmCard asking first. */
  overlay?: ReactNode;
};

/**
 * A sheet that slides up from the bottom over a dimmed screen. Render it only while it's open.
 * There's no cancel: whatever was picked counts, however the sheet goes away.
 */
export function Sheet({ title, onClose, children, footer, overlay }: Props) {
  const insets = useSafeAreaInsets();
  // drag the bar or the title down to put it away
  const drag = useDragToClose(onClose);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: drag.dim }]}>
        <Pressable style={styles.dim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottom} pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, { paddingBottom: 14 + insets.bottom, transform: [{ translateY: drag.drop }] }]}
          onLayout={drag.measure}
          accessibilityViewIsModal
          accessibilityLabel={title}
        >
          <View style={[styles.top, title ? { paddingBottom: 12 } : null]} {...drag.pan.panHandlers}>
            <View style={styles.handle} />
            {title ? <Hand size={24}>{title}</Hand> : null}
          </View>
          <ScrollView
            style={{ flexGrow: 0 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            // on iOS you can also pull the content down past the top to put the sheet away
            onScrollEndDrag={(e) => {
              if (e.nativeEvent.contentOffset.y < -80) drag.away();
            }}
          >
            {children}
          </ScrollView>
          {footer ? <View style={{ marginTop: 14 }}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
      {overlay}
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFill, backgroundColor: colors.dim },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%', backgroundColor: colors.paper, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: colors.ink,
    borderTopLeftRadius: 22, borderTopRightRadius: 18, paddingHorizontal: 18,
  },
  // the drag area: the bar and the title, padded so it's easy to grab
  top: { paddingTop: 10 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.rule, marginBottom: 12 },
});
