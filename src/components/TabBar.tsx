import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';
import { Icon, IconName } from './Icon';
import { Paper } from './Paper';
import { Hand, MonoMedium } from './Text';
import { Surface } from './Surface';

export type TabName = 'home' | 'lists';

const TAB = 44;
const TAB_UP = 52;
/** How far the tabs reach down into the home-indicator area: enough to look attached, not the whole inset. */
const reach = (inset: number) => Math.max(6, inset - 16);

/** Home, + and your lists as folder tabs along the bottom of the two root screens. + opens the "new" menu over the screen. */
export function TabBar({ active, onTab }: { active: TabName | null; onTab: (tab: TabName) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tabs active={open ? null : active} plusOpen={open} onPlus={() => setOpen(!open)} onTab={onTab} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Surface tone="light">
        <Pressable style={styles.dim} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close" />
        <PlusMenu close={() => setOpen(false)} />
        <Tabs active={null} plusOpen onPlus={() => setOpen(false)} onTab={(t) => { setOpen(false); onTab(t); }} />
        </Surface>
      </Modal>
    </>
  );
}

function Tabs({ active, plusOpen, onPlus, onTab }: { active: TabName | null; plusOpen: boolean; onPlus: () => void; onTab: (tab: TabName) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: TAB_UP + reach(insets.bottom) }]} pointerEvents="box-none">
      <Tab icon="home" label="Home" color={colors.olive} up={active === 'home'} bottom={reach(insets.bottom)} onPress={() => onTab('home')} />
      <Tab icon={plusOpen ? 'x' : 'plus'} label={plusOpen ? 'Close' : 'Add an item or start a list'} color={colors.paper} ink={colors.ink} up={plusOpen} bottom={reach(insets.bottom)} onPress={onPlus} />
      <Tab icon="list" label="Your lists" color={colors.burntOrange} up={active === 'lists'} bottom={reach(insets.bottom)} onPress={() => onTab('lists')} />
    </View>
  );
}

function Tab({ icon, label, color, ink = colors.paper, up, bottom, onPress }: { icon: IconName; label: string; color: string; ink?: string; up: boolean; bottom: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: up }}
      style={[styles.tab, { backgroundColor: color, height: (up ? TAB_UP : TAB) + bottom, paddingBottom: bottom }]}
    >
      <Surface fill={color}><Icon name={icon} size={28} color={ink} /></Surface>
    </Pressable>
  );
}

function PlusMenu({ close }: { close: () => void }) {
  const insets = useSafeAreaInsets();
  const open = (path: '/list/new' | '/item/new') => {
    close();
    router.push(path);
  };
  return (
    <View style={[styles.menu, { bottom: TAB_UP + reach(insets.bottom) + space.md }]}>
      <Paper fill={colors.paper} edge="olive" edgeWidth={2} shape={1} style={styles.menuTab}>
        <MonoMedium size={11.5}>new</MonoMedium>
      </Paper>
      <Paper fill={colors.paper} edge="olive" edgeWidth={2} style={styles.menuBody}>
        <MenuRow icon="list" tint={colors.almostWhite} title="start a list" onPress={() => open('/list/new')} />
        <View style={styles.dash} />
        <MenuRow icon="pencil" tint={colors.sage} title="add an item" onPress={() => open('/item/new')} />
      </Paper>
    </View>
  );
}

function MenuRow({ icon, tint, title, onPress }: { icon: IconName; tint: string; title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow} accessibilityRole="button" accessibilityLabel={title}>
      <Paper fill={tint} shape={4} style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} />
      </Paper>
      <Hand size={20} style={{ flex: 1 }}>{title}</Hand>
      <Icon name="right" size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14 },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 16, borderTopRightRadius: 18,
    shadowColor: '#3A1000', shadowOpacity: 0.35, shadowRadius: 0, shadowOffset: { width: 0, height: -2 },
  },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: colors.dim },
  menu: { position: 'absolute', left: 34, right: 34 },
  // the same corners as Home's folder tabs and folder (FolderTab, FolderScreen)
  menuTab: {
    alignSelf: 'flex-start', height: 36, paddingHorizontal: 18, justifyContent: 'center', borderBottomWidth: 0, marginBottom: -2, zIndex: 2,
    borderTopLeftRadius: 10, borderTopRightRadius: 13, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  menuBody: { padding: 8, borderTopLeftRadius: 0, borderTopRightRadius: 18, borderBottomRightRadius: 20, borderBottomLeftRadius: 15 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10 },
  dash: { marginHorizontal: 10, borderTopWidth: 1.3, borderStyle: 'dashed', borderColor: colors.rule },
});
