import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

/**
 * Where the pager is, from useTabPosition: `position` is the tab it's on, in between while you
 * drag (0.5 is halfway from the first to the second). It's worked out on the phone's side, from
 * the scroll, so the tab bar keeps up with your finger even while the app is busy.
 */
export type TabPosition = { position: Animated.AnimatedDivision<number>; x: Animated.Value; page: Animated.Value };

export function useTabPosition(at: number): TabPosition {
  const [p] = useState(() => {
    // until the pager has a width, a page is "1 wide", so position starts on the right tab
    const x = new Animated.Value(at);
    const page = new Animated.Value(1);
    return { x, page, position: Animated.divide(x, page) };
  });
  return p;
}

/**
 * Tabs side by side that you can drag between, like a profile on Instagram: the next tab comes
 * in with your finger, and a drag past halfway or a quick flick switches. Tapping a tab slides
 * over to it. Every page is drawn. The pager is as tall as the page showing, and at least
 * reaches the bottom of the screen, so you can drag on the empty space under a short page.
 * `bleed` is the screen's side padding, so pages slide edge to edge instead of inside it.
 * The tab bar follows `tracking.position` as you drag; `tab` itself only changes once the
 * page settles, so nothing re-renders (or changes height) under your finger.
 */
export function SwipeTabs<T extends string>({ tabs, tab, onChange, pages, tracking, bleed = 0, style }: {
  tabs: readonly T[];
  tab: T;
  onChange: (tab: T) => void;
  pages: Record<T, ReactNode>;
  tracking: TabPosition;
  bleed?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const pager = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<Partial<Record<T, number>>>({});
  const at = Math.max(0, tabs.indexOf(tab));
  // the page the pager last settled on
  const showing = useRef(at);

  // a tapped tab (or Home's reset) slides the pager to match; the first time, it just starts there.
  // A tab picked by dragging is already there, so it's left alone.
  const placed = useRef(false);
  useEffect(() => {
    if (!width || (placed.current && showing.current === at)) return;
    pager.current?.scrollTo({ x: at * width, animated: placed.current });
    showing.current = at;
    placed.current = true;
  }, [at, width]);

  const [onScroll] = useState(() => Animated.event([{ nativeEvent: { contentOffset: { x: tracking.x } } }], { useNativeDriver: true }));

  const settled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (!tabs[i] || i === showing.current) return;
    showing.current = i;
    onChange(tabs[i]);
  };

  return (
    <View
      // the pager sits over this box rather than in it, so the tallest page can't stretch it: it's
      // as tall as the page showing, and grows to fill the space left on the screen
      style={[{ marginHorizontal: -bleed, flexGrow: 1, minHeight: width ? heights[tab] : undefined }, style]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w === width) return;
        // both together, so position doesn't blink to the wrong tab between them
        tracking.page.setValue(w);
        tracking.x.setValue(showing.current * w);
        setWidth(w);
      }}
    >
      {width ? (
        <Animated.ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          directionalLockEnabled
          // a tap on a button inside (like a comment's send) goes to the button, not to closing the keyboard
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: at * width, y: 0 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={settled}
          // let go exactly on a page and there's no momentum to wait for
          onScrollEndDrag={(e) => {
            if (Math.abs(e.nativeEvent.contentOffset.x % width) < 1) settled(e);
          }}
          style={StyleSheet.absoluteFill}
          // each page keeps its own height instead of stretching to the tallest
          contentContainerStyle={{ alignItems: 'flex-start' }}
        >
          {tabs.map((t) => (
            <View
              key={t}
              style={{ width, paddingHorizontal: bleed }}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                setHeights((was) => (was[t] === h ? was : { ...was, [t]: h }));
              }}
              // only the page showing is there for screen readers
              accessibilityElementsHidden={t !== tab}
              importantForAccessibility={t === tab ? 'auto' : 'no-hide-descendants'}
            >
              {pages[t]}
            </View>
          ))}
        </Animated.ScrollView>
      ) : (
        <View style={{ paddingHorizontal: bleed }}>{pages[tab]}</View>
      )}
    </View>
  );
}
