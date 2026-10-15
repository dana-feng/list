import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import * as haptics from '@/haptics';

/** What a row gets so it can be moved: `hold` goes on its long press, `move` is the same thing for screen readers. */
export type Handle = { hold: () => void; move: (by: -1 | 1) => void };

const HandleContext = createContext<Handle | undefined>(undefined);

/** For a row inside a Reorderable. Undefined anywhere else, or when its rows can't be moved. */
export const useReorderHandle = () => useContext(HandleContext);

type Props<T> = {
  items: T[];
  gap: number;
  /** Called with every id, top to bottom, once a row is dropped somewhere new. Leave out and rows stay put. */
  onReorder?: (ids: string[]) => void;
  /** True from the long press until the row lands: turn scrolling off meanwhile. */
  onDragging?: (dragging: boolean) => void;
  children: (item: T, index: number) => ReactNode;
};

type Drag = { id: string; from: number; to: number };

/** A column of rows you can rearrange: hold one until it lifts, then drag it up or down. */
export function Reorderable<T extends { id: string }>({ items, gap, onReorder, onDragging, children }: Props<T>) {
  // where a row was just dropped, shown until the new order comes back down through `items`
  const [landed, setLanded] = useState<string[] | null>(null);
  // (or the list changed underneath it, and `items` is the better guess)
  if (landed && (landed.length !== items.length || landed.every((id, i) => id === items[i].id))) setLanded(null);
  const rows = landed ? [...items].sort((a, b) => landed.indexOf(a.id) - landed.indexOf(b.id)) : items;
  const ids = rows.map((i) => i.id);
  const [active, setActive] = useState<string | null>(null);
  // nothing's being dragged, so the rows sit where they're laid out. The offsets are only hooked up during a drag:
  // a render that read them at the moment of a drop would put each moved row at its new place *plus* its old offset
  const [resting, setResting] = useState(true);
  // how far each row is from where it's laid out
  const [offsets] = useState(() => new Map<string, Animated.Value>());
  const [lift] = useState(() => new Animated.Value(0));
  const layouts = useRef(new Map<string, { y: number; h: number }>());
  const drag = useRef<Drag | null>(null);
  // where the finger was when the drag took the touch
  const startY = useRef(0);

  const offset = (id: string) => {
    let v = offsets.get(id);
    if (!v) offsets.set(id, (v = new Animated.Value(0)));
    return v;
  };

  const hold = (id: string) => {
    const from = ids.indexOf(id);
    if (drag.current || from < 0 || ids.length < 2) return;
    drag.current = { id, from, to: from };
    // still unhooked from the rows, so this doesn't move anything on screen
    offsets.forEach((v) => v.setValue(0));
    setResting(false);
    haptics.hold();
    Animated.spring(lift, { toValue: 1, useNativeDriver: false, friction: 7 }).start();
    setActive(id);
    onDragging?.(true);
  };

  const move = (dy: number) => {
    const d = drag.current;
    const me = d && layouts.current.get(d.id);
    const first = layouts.current.get(ids[0]);
    const last = layouts.current.get(ids[ids.length - 1]);
    if (!d || !me || !first || !last) return;
    // stay inside the column
    const y = Math.max(first.y - me.y, Math.min(last.y + last.h - me.h - me.y, dy));
    offset(d.id).setValue(y);
    // it takes a row's place once its leading edge passes that row's middle. (Its own middle
    // can't be the test: held inside the column, it never gets past the top or bottom row's.)
    const top = me.y + y;
    const bottom = top + me.h;
    let to = d.from;
    ids.forEach((id, i) => {
      const l = layouts.current.get(id);
      if (!l) return;
      if (i > d.from && bottom > l.y + l.h / 2) to = Math.max(to, i);
      if (i < d.from && top < l.y + l.h / 2) to = Math.min(to, i);
    });
    if (to === d.to) return;
    d.to = to;
    haptics.tick();
    ids.forEach((id, i) => {
      if (id === d.id) return;
      const shift = i > d.from && i <= to ? -(me.h + gap) : i < d.from && i >= to ? me.h + gap : 0;
      Animated.timing(offset(id), { toValue: shift, duration: 140, useNativeDriver: false }).start();
    });
  };

  const drop = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const order = ids;
    // slide into the gap the others left, then hand over the new order
    let slot = 0;
    for (let i = Math.min(d.from, d.to); i <= Math.max(d.from, d.to); i++) {
      if (i !== d.from) slot += ((layouts.current.get(order[i])?.h ?? 0) + gap) * Math.sign(d.to - d.from);
    }
    if (d.to !== d.from) haptics.tick();
    Animated.spring(lift, { toValue: 0, useNativeDriver: false, friction: 7 }).start();
    Animated.timing(offset(d.id), { toValue: slot, duration: 120, useNativeDriver: false }).start(() => {
      // one render: every row laid out in its new place, with no offsets
      if (d.to !== d.from) {
        const next = [...order];
        next.splice(d.to, 0, next.splice(d.from, 1)[0]);
        setLanded(next);
      }
      setResting(true);
      setActive(null);
      onDragging?.(false);
    });
  };

  // only then hand the order up. Saving it re-renders straight away, ahead of the render above, so doing it
  // in the drop would draw the new order with the drag's offsets still on for a frame
  useEffect(() => {
    if (landed) onReorder?.(landed);
  }, [landed]); // eslint-disable-line react-hooks/exhaustive-deps -- once per drop, not whenever the parent re-renders

  const moveBy = (id: string, by: -1 | 1) => {
    const from = ids.indexOf(id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onReorder?.(next);
  };

  return (
    <View
      style={{ gap }}
      // a held row is waiting: take the touch from it (and from the scroll view) as soon as the finger moves
      onMoveShouldSetResponderCapture={() => !!drag.current}
      onResponderGrant={(e) => {
        startY.current = e.nativeEvent.pageY;
        return true; // Android: keep the scroll view from taking it back
      }}
      onResponderTerminationRequest={() => false}
      onResponderMove={(e) => move(e.nativeEvent.pageY - startY.current)}
      onResponderRelease={drop}
      onResponderTerminate={drop}
      // these also catch a hold that was let go without ever moving
      onTouchEnd={drop}
      onTouchCancel={drop}
    >
      {rows.map((item, i) => (
        <Animated.View
          key={item.id}
          onLayout={(e) => {
            layouts.current.set(item.id, { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height });
          }}
          style={{
            zIndex: active === item.id ? 1 : 0,
            // one plain entry rather than the drag's two, so it never looks unchanged and always reaches the native view.
            // (Not `undefined`: taking the transform away sends a null that React Native's transform check trips over.)
            transform: resting
              ? [{ translateY: 0 }]
              : [
                  { translateY: offset(item.id) },
                  { scale: active === item.id ? lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) : 1 },
                ],
          }}
        >
          <HandleContext.Provider value={onReorder ? { hold: () => hold(item.id), move: (by) => moveBy(item.id, by) } : undefined}>
            {children(item, i)}
          </HandleContext.Provider>
        </Animated.View>
      ))}
    </View>
  );
}
