import { useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, Profile, useDb } from '@/api/db';
import { followingOf, getProfile, myFollowers, searchPeople, useFindPeople } from '@/api/profiles';
import { colors } from '@/theme';
import { Avatar } from './Avatar';
import { Pill } from './Button';
import { Paper } from './Paper';
import { Circle } from './Scribble';
import { SearchField } from './SearchField';
import { Hand, Mono } from './Text';
import { useDragToClose } from './dragToClose';

type Props = {
  title: string;
  /** Who starts out ticked. */
  initial: string[];
  /** Already on the list: left out of the choices. */
  locked?: string[];
  /** followers (the default): only people who follow you. anyone: search everyone; with nothing typed, `suggested` first, then people you follow and who follow you. */
  pool?: 'followers' | 'anyone';
  /** For pool="anyone": who to show first before anything's typed. */
  suggested?: string[];
  /** The most that can be ticked. */
  max?: number;
  onDone: (ids: string[]) => void;
  onClose: () => void;
};

/** For pool="anyone" with nothing typed: who's ticked, who's suggested, then your people. Once each. */
function nearby(picked: string[], suggested: string[]): Profile[] {
  const ids = [...picked, ...suggested, ...followingOf(db.me).map((p) => p.id), ...myFollowers().map((p) => p.id)];
  return [...new Set(ids)].map((id) => getProfile(id)).filter((p): p is Profile => !!p && p.id !== db.me);
}

/**
 * A sheet over the screen: search people and tick them. Used for "owners", for "specific people"
 * (both from your followers), and for who you did something with (anyone).
 * Render it only while it's open, so it starts fresh from `initial` each time.
 */
export function PersonPicker({ title, initial, locked = [], pool = 'followers', suggested = [], max, onDone, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>(initial);
  // "anyone" also searches people you aren't connected to; they show up as they arrive
  useDb();
  useFindPeople(pool === 'anyone' ? q : '');
  const s = q.trim().toLowerCase().replace(/^@/, '');
  const choices = pool === 'anyone'
    ? (s ? searchPeople(s) : nearby(picked, suggested))
    : myFollowers().filter((p) => p.name.toLowerCase().includes(s) || p.username.includes(s));
  const people = choices.filter((p) => !locked.includes(p.id));
  const full = max !== undefined && picked.length >= max;
  const drag = useDragToClose(onClose);
  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : full ? cur : [...cur, id]));
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: drag.dim }]}>
        <Pressable style={styles.dim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View style={[styles.place, { bottom: 10 + insets.bottom, transform: [{ translateY: drag.drop }] }]} onLayout={drag.measure}>
        <Paper fill={colors.paper} edge="ink" shape={5} round={1.4} style={styles.sheet}>
          {/* drag the bar or the title down to put it away */}
          <View {...drag.pan.panHandlers}>
            <View style={styles.handle} />
            <View style={styles.head}>
              <Hand size={22}>{title}</Hand>
              <Pill label={picked.length ? `done · ${picked.length}` : 'done'} height={36} onPress={() => onDone(picked)} />
            </View>
          </View>
          <SearchField value={q} onChange={setQ} placeholder="find people" />
          <ScrollView style={{ flex: 1, marginTop: 6 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {people.map((p) => {
              const on = picked.includes(p.id);
              return (
                <Pressable key={p.id} onPress={() => toggle(p.id)} disabled={!on && full} style={[styles.row, !on && full && { opacity: 0.4 }]} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: !on && full }} accessibilityLabel={p.name}>
                  <Avatar person={p} size={34} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Hand size={17}>{p.name}</Hand>
                    <Mono size={10.5} color={colors.inkSoft}>@{p.username}</Mono>
                  </View>
                  <Circle filled={on} size={26} />
                </Pressable>
              );
            })}
            {!people.length ? (
              <Mono size={12} color={colors.inkSoft} style={{ marginTop: 16, lineHeight: 18 }}>
                {s ? 'no one by that name.' : pool === 'anyone' ? 'search for anyone by name or @username.' : 'once people follow you, you can add them here.'}
              </Mono>
            ) : null}
          </ScrollView>
          {full ? <Mono size={11} color={colors.inkSoft} style={{ marginTop: 6 }}>that’s as many as one thing can have.</Mono> : null}
        </Paper>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFill, backgroundColor: colors.dim },
  place: { position: 'absolute', left: 10, right: 10, top: 210 },
  sheet: { flex: 1, padding: 14, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.rule, marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
});
