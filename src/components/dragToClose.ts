import { useEffect, useState } from 'react';
import { Animated, Dimensions, LayoutChangeEvent, PanResponder } from 'react-native';

/**
 * Drag a sheet down to put it away, for anything that slides up from the bottom (Sheet,
 * PersonPicker, CommentsSheet). Spread `pan.panHandlers` on the part you grab (the bar and the
 * title), move the sheet by `drop`, fade the dim with `dim`, and pass `measure` to the sheet's
 * onLayout. Past a third of the sheet's height, or a flick, and it goes, then `onClose` runs;
 * otherwise it springs back up. `away` sends it off the same way, for pulling a scroll view down
 * past its top.
 */
export function useDragToClose(onClose: () => void) {
  const [drag] = useState(() => {
    const drop = new Animated.Value(0);
    let height = Dimensions.get('window').height;
    let closing: (() => void) | null = null;
    const away = () =>
      Animated.timing(drop, { toValue: Dimensions.get('window').height, duration: 200, useNativeDriver: true }).start(() => closing?.());
    const back = () => Animated.spring(drop, { toValue: 0, useNativeDriver: true, friction: 9, tension: 90 }).start();
    return {
      drop,
      dim: drop.interpolate({ inputRange: [0, 400], outputRange: [1, 0], extrapolate: 'clamp' }),
      away,
      measure: (e: LayoutChangeEvent) => {
        height = e.nativeEvent.layout.height;
      },
      setClosing: (fn: () => void) => {
        closing = fn;
      },
      pan: PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderMove: (_, g) => drop.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => (g.dy > height / 3 || (g.dy > 30 && g.vy > 0.8) ? away() : back()),
        onPanResponderTerminate: back,
      }),
    };
  });
  // the latest onClose, so a parent re-rendering mid-drag still gets the right one
  useEffect(() => drag.setClosing(onClose), [drag, onClose]);
  return drag;
}
