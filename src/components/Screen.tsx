import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { refresh } from '@/api/sync';
import { colors, space, TAB_BAR_HEIGHT } from '@/theme';

type Common = {
  children: ReactNode;
  header?: ReactNode;
  /** Pinned under the content, e.g. a full-width button. */
  footer?: ReactNode;
  /** Pull down to reload from the server. */
  refreshable?: boolean;
  scroll?: boolean;
  scrollEnabled?: boolean;
  overlay?: ReactNode;
  /** The (tabs) layout draws the tab bar; just leave room for it. Screens opened on top of the tabs don't show it. */
  insideTabs?: boolean;
};

function useBottomPad(insideTabs?: boolean, footer?: ReactNode) {
  const insets = useSafeAreaInsets();
  if (insideTabs) return TAB_BAR_HEIGHT + insets.bottom + space.xl;
  return footer ? space.lg : insets.bottom + space.xxl;
}

function useRefresher(on?: boolean) {
  const [refreshing, setRefreshing] = useState(false);
  if (!on) return undefined;
  const onRefresh = () => {
    setRefreshing(true);
    refresh().finally(() => setRefreshing(false));
  };
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.paper} colors={[colors.ink]} />;
}

/** Scrolls the screen so all of `target` sits above the keyboard (when it doesn't already). */
type Reveal = (target: View | null) => void;
const RevealContext = createContext<Reveal>(() => {});

/** For a field that grows as you type: call it on focus and as the field grows. */
export const useReveal = () => useContext(RevealContext);

/** A scroll view's ref and props that let what's inside it ask to be scrolled into view. */
function useRevealer() {
  const scroller = useRef<ScrollView>(null);
  const offset = useRef(0);
  const reveal = useCallback<Reveal>((target) => {
    const node = scroller.current?.getNativeScrollRef();
    if (!target || !node) return;
    node.measureInWindow((_x, top, _w, height) => {
      target.measureInWindow((_tx, ty, _tw, th) => {
        // a little room under it, so the bottom edge isn't flush with the keyboard
        const below = ty + th + 16 - (top + height);
        if (below > 0) scroller.current?.scrollTo({ y: offset.current + below, animated: true });
      });
    });
  }, []);
  const props = useMemo(() => ({
    ref: scroller,
    scrollEventThrottle: 32,
    onScroll: (e: { nativeEvent: { contentOffset: { y: number } } }) => { offset.current = e.nativeEvent.contentOffset.y; },
  }), []);
  return { reveal, props };
}

function Shell({ header, footer, overlay, children }: Pick<Common, 'header' | 'footer' | 'overlay' | 'children'>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.night}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingTop: insets.top + 6 }}>{header}</View>
        {children}
        {footer ? <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: insets.bottom + space.lg }}>{footer}</View> : null}
      </KeyboardAvoidingView>
      {overlay}
    </View>
  );
}

/** A screen straight on the dark background: profiles, sign-up, "done". */
export function Screen({ children, header, footer, refreshable, scroll = true, scrollEnabled, overlay, insideTabs, contentStyle }: Common & { contentStyle?: StyleProp<ViewStyle> }) {
  const bottom = useBottomPad(insideTabs, footer);
  const refresher = useRefresher(refreshable);
  // flexGrow lets content (like SwipeTabs) stretch to the bottom of the screen when it's short
  const pad = [{ flexGrow: 1, paddingHorizontal: 18, paddingBottom: bottom }, contentStyle];
  const { reveal, props } = useRevealer();
  return (
    <Shell header={header} footer={footer} overlay={overlay}>
      {scroll ? (
        <ScrollView
          {...props}
          style={styles.fill}
          contentContainerStyle={pad}
          scrollEnabled={scrollEnabled}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refresher}
        >
          <RevealContext.Provider value={reveal}>{children}</RevealContext.Provider>
        </ScrollView>
      ) : (
        <View style={[styles.fill, ...pad]}>{children}</View>
      )}
    </Shell>
  );
}

/**
 * The folder screen most of the app uses: a header on the dark background, folder tabs,
 * and one big paper folder holding the content.
 */
export function FolderScreen({ children, header, footer, refreshable, scroll = true, scrollEnabled, overlay, insideTabs, folderTabs, roundCorner }: Common & {
  /** The tab(s) sticking up from the folder. */
  folderTabs: ReactNode;
  /** Round the folder's top-left corner (when the active tab isn't the first one). */
  roundCorner?: boolean;
}) {
  const bottom = useBottomPad(insideTabs, footer);
  const refresher = useRefresher(refreshable);
  const { reveal, props } = useRevealer();
  return (
    <Shell header={header} footer={footer} overlay={overlay}>
      <View style={styles.folderTabs}>{folderTabs}</View>
      <View style={[styles.folder, roundCorner && { borderTopLeftRadius: 15 }]}>
        {scroll ? (
          <ScrollView
            {...props}
            style={styles.fill}
            contentContainerStyle={{ flexGrow: 1, padding: 12, paddingTop: 16, paddingBottom: bottom }}
            scrollEnabled={scrollEnabled}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={refresher}
          >
            <RevealContext.Provider value={reveal}>{children}</RevealContext.Provider>
          </ScrollView>
        ) : (
          <View style={[styles.fill, { padding: 12, paddingTop: 16, paddingBottom: bottom }]}>{children}</View>
        )}
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  night: { flex: 1, backgroundColor: colors.night },
  fill: { flex: 1 },
  folderTabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, marginTop: space.sm, zIndex: 2 },
  folder: {
    flex: 1, marginLeft: 12, marginRight: 16, marginBottom: 12, backgroundColor: colors.paper, overflow: 'hidden',
    borderTopLeftRadius: 0, borderTopRightRadius: 18, borderBottomRightRadius: 20, borderBottomLeftRadius: 15,
  },
});
