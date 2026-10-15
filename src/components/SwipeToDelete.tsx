import { ReactNode, useRef, useState } from 'react';
import { Animated, GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import { tap } from '@/haptics';
import { colors } from '@/theme';
import { MonoMedium } from './Text';

const REVEAL = 92;

/**
 * A row you can slide left to show "delete" behind it. Tap "delete" to delete, or anywhere on the row to slide it back.
 * Leave out `onDelete` and it's just the row.
 */
export function SwipeToDelete({ children, onDelete, label }: { children: ReactNode; onDelete?: () => void; label: string }) {
  const [x] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState(false);
  // where the finger came down, and where the row was then
  const start = useRef({ x: 0, y: 0, from: 0 });
  // which side of halfway the row is on, so crossing it can tap
  const past = useRef(false);
  const settle = (to: boolean) => {
    setOpen(to);
    Animated.spring(x, { toValue: to ? -REVEAL : 0, useNativeDriver: false, friction: 8 }).start();
  };
  const dx = (e: GestureResponderEvent) => e.nativeEvent.pageX - start.current.x;
  const gesture = {
    onTouchStart: (e: GestureResponderEvent) => {
      start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, from: open ? -REVEAL : 0 };
      past.current = open;
    },
    // only a clearly sideways drag: up and down is for scrolling, and holding still is for reordering
    onMoveShouldSetResponder: (e: GestureResponderEvent) => {
      const dy = e.nativeEvent.pageY - start.current.y;
      return Math.abs(dx(e)) > 12 && Math.abs(dx(e)) > Math.abs(dy) * 1.5;
    },
    onResponderTerminationRequest: () => false,
    onResponderMove: (e: GestureResponderEvent) => {
      const to = start.current.from + dx(e);
      if (to < -REVEAL / 2 !== past.current) {
        past.current = !past.current;
        tap();
      }
      x.setValue(Math.max(-REVEAL * 1.25, Math.min(0, to)));
    },
    onResponderRelease: (e: GestureResponderEvent) => settle(start.current.from + dx(e) < -REVEAL / 2),
    onResponderTerminate: () => settle(open),
  };

  if (!onDelete) return <>{children}</>;
  return (
    <View
      accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}
    >
      <Pressable onPress={onDelete} style={styles.delete} accessibilityRole="button" accessibilityLabel={`Delete ${label}`} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'yes' : 'no-hide-descendants'}>
        <MonoMedium size={13} color={colors.paper}>delete</MonoMedium>
      </Pressable>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...gesture}>
        {children}
        {/* while it's open, a tap anywhere on the row just slides it back */}
        {open ? <Pressable style={StyleSheet.absoluteFill} onPress={() => settle(false)} accessibilityRole="button" accessibilityLabel="Close" /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  delete: {
    position: 'absolute', top: 2, bottom: 2, right: 0, width: REVEAL + 12, backgroundColor: colors.bark,
    borderTopLeftRadius: 6, borderTopRightRadius: 10, borderBottomRightRadius: 5, borderBottomLeftRadius: 9,
    alignItems: 'flex-end', justifyContent: 'center', paddingRight: 18,
  },
});
