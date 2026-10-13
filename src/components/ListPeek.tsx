import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import type { List } from '@/api/db';
import { itemsForList } from '@/api/items';
import { deleteList, listPeople, progressLabel } from '@/api/lists';
import { names } from '@/lib';
import { colors, folderFills, hash } from '@/theme';
import { AvatarStack } from './Avatar';
import { LinkText } from './Button';
import { Paper } from './Paper';
import { Hand, Mono, MonoMedium } from './Text';

const SHOW_ITEMS = 5;

/**
 * Press and hold a list folder on your profile: the folder comes up close over a dimmed screen,
 * with what's on it, and "delete list" underneath. Tap the folder to open it, anywhere else to put it back.
 */
export function ListPeek({ list, onOpen, onClose }: { list: List; onOpen: () => void; onClose: () => void }) {
  const [pop] = useState(() => new Animated.Value(0));
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 6, tension: 110 }).start();
  }, [pop]);

  const fill = folderFills[hash(list.id) % folderFills.length];
  const people = listPeople(list.id);
  const { open, done: finished } = itemsForList(list.id);
  const items = [...open, ...finished];
  const more = items.length - SHOW_ITEMS;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.fill} accessibilityViewIsModal>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.dim }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <Animated.View style={[styles.stack, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}>
          <View style={[styles.tab, { backgroundColor: fill }]}>
            <MonoMedium size={12}>{progressLabel(list.id)}</MonoMedium>
          </View>
          <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${list.title}`} style={[styles.body, { backgroundColor: fill }]}>
            <Hand size={26} style={{ lineHeight: 28 }}>{list.title}</Hand>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AvatarStack people={people} size={22} />
              <Mono size={11} style={{ flexShrink: 1 }} numberOfLines={1}>{names(people)}</Mono>
            </View>
            <View style={styles.items}>
              {items.slice(0, SHOW_ITEMS).map((item) => (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.circle, item.done_at ? { backgroundColor: colors.olive, borderColor: colors.olive } : null]} />
                  <Hand
                    size={16}
                    numberOfLines={1}
                    color={item.done_at ? colors.inkSoft : colors.ink}
                    style={{ flex: 1, textDecorationLine: item.done_at ? 'line-through' : 'none' }}
                  >
                    {item.title}
                  </Hand>
                </View>
              ))}
              {more > 0 ? <Mono size={11} color={colors.inkSoft}>+ {more} more</Mono> : null}
              {!items.length ? <Mono size={11} color={colors.inkSoft}>nothing on it yet.</Mono> : null}
            </View>
          </Pressable>

          <Paper fill={fill} shape={4} round={1.2} style={styles.menu}>
            {confirming ? (
              <>
                <Mono size={12} center color={colors.inkSoft}>are you sure?</Mono>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <LinkText label="yes" color={colors.bark} onPress={() => deleteList(list.id)} />
                  <LinkText label="no" onPress={onClose} />
                </View>
              </>
            ) : (
              <LinkText label="delete list" color={colors.bark} onPress={() => setConfirming(true)} />
            )}
          </Paper>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  stack: { width: '100%', maxWidth: 340 },
  tab: { alignSelf: 'flex-start', height: 36, minWidth: 72, paddingHorizontal: 14, justifyContent: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 12 },
  body: { padding: 18, gap: 12, borderTopLeftRadius: 0, borderTopRightRadius: 18, borderBottomRightRadius: 16, borderBottomLeftRadius: 19 },
  items: { gap: 8, marginTop: 4 },
  circle: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.ink },
  menu: { alignSelf: 'center', alignItems: 'center', marginTop: 14, paddingHorizontal: 18, paddingVertical: 4, maxWidth: 300 },
});
