import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';
import { FolderCard } from './FolderCard';
import { Icon } from './Icon';
import { Sans, Serif } from './Text';

export type TabName = 'home' | 'lists';

const STRIP = 14;

/** Home, + and lists as folder tabs. Home and lists are tabs; + opens the "new" sheet. */
export function TabBar({ active, onTab }: { active: TabName; onTab?: (tab: TabName) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tabs active={open ? null : active} plusOpen={open} onPlus={() => setOpen(!open)} onTab={onTab} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dim} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <PlusSheet close={() => setOpen(false)} />
        <Tabs active={null} plusOpen onPlus={() => setOpen(false)} onTab={onTab} />
      </Modal>
    </>
  );
}

function Tabs({ active, plusOpen, onPlus, onTab }: { active: TabName | null; plusOpen: boolean; onPlus: () => void; onTab?: (tab: TabName) => void }) {
  const insets = useSafeAreaInsets();
  const go = (tab: TabName) => {
    if (plusOpen) onPlus();
    if (onTab) return onTab(tab);
    // from a screen stacked above the tabs: drop back to them, then switch
    if (router.canDismiss()) router.dismissAll();
    router.navigate(tab === 'home' ? '/' : '/me');
  };
  return (
    <View style={styles.bar} pointerEvents="box-none">
      <View style={styles.row} pointerEvents="box-none">
        <Tab label="Home" raised={active === 'home'} color={active === 'home' ? colors.cream : colors.dark} onPress={() => go('home')}>
          <Icon name="home" color={active === 'home' ? colors.ink : colors.onDark} />
        </Tab>
        <Tab label={plusOpen ? 'Close' : 'New'} raised={plusOpen} color={colors.gold} onPress={onPlus}>
          <Icon name={plusOpen ? 'x' : 'plus'} size={24} />
        </Tab>
        <Tab label="Your lists" raised={active === 'lists'} color={active === 'lists' ? colors.cream : colors.dark} onPress={() => go('lists')}>
          <Icon name="list" color={active === 'lists' ? colors.ink : colors.onDark} />
        </Tab>
      </View>
      <View style={{ height: STRIP + insets.bottom, backgroundColor: colors.cream }} />
    </View>
  );
}

function Tab({ children, raised, color, onPress, label }: { children: React.ReactNode; raised: boolean; color: string; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.tab, { backgroundColor: color, height: raised ? 58 : 50 }, raised && styles.raised]}
    >
      {children}
    </Pressable>
  );
}

function PlusSheet({ close }: { close: () => void }) {
  const insets = useSafeAreaInsets();
  const open = (path: '/list/new' | '/item/new') => {
    close();
    router.push(path);
  };
  return (
    <View style={[styles.sheet, { bottom: 58 + STRIP + insets.bottom + space.xl }]}>
      <FolderCard tab="new" color={colors.cream} padding={0}>
        <SheetRow icon="folder" title="Start a list" body="name it, invite people, choose who sees it" onPress={() => open('/list/new')} />
        <View style={styles.dots} />
        <SheetRow icon="square" title="Add a thing" body="to one of your lists" onPress={() => open('/item/new')} />
      </FolderCard>
    </View>
  );
}

function SheetRow({ icon, title, body, onPress }: { icon: 'folder' | 'square'; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.sheetRow} accessibilityRole="button">
      <Icon name={icon} size={24} />
      <View style={{ flex: 1 }}>
        <Serif size={20}>{title}</Serif>
        <Sans size={13} color={colors.inkSoft}>{body}</Sans>
      </View>
      <Icon name="right" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: space.lg },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  raised: { shadowColor: '#1B2414', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: -2 } },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(58,70,48,0.55)' },
  sheet: { position: 'absolute', left: space.lg, right: space.lg },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.lg },
  dots: { marginHorizontal: space.lg, borderBottomWidth: 1.5, borderStyle: 'dotted', borderColor: colors.line },
});
