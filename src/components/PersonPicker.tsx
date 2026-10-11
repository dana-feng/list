import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { myFollowers } from '@/api/profiles';
import { colors } from '@/theme';
import { Avatar } from './Avatar';
import { Pill } from './Button';
import { Paper } from './Paper';
import { Circle } from './Scribble';
import { SearchField } from './SearchField';
import { Hand, Mono } from './Text';

type Props = {
  title: string;
  /** Who starts out ticked. */
  initial: string[];
  /** Already on the list: left out of the choices. */
  locked?: string[];
  onDone: (ids: string[]) => void;
  onClose: () => void;
};

/**
 * A sheet over the screen: search your followers and tick people. Used for "owners" and for "specific people".
 * Render it only while it's open, so it starts fresh from `initial` each time.
 */
export function PersonPicker({ title, initial, locked = [], onDone, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>(initial);
  const s = q.trim().toLowerCase().replace(/^@/, '');
  const people = myFollowers().filter((p) => !locked.includes(p.id) && (p.name.toLowerCase().includes(s) || p.username.includes(s)));
  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      <Paper fill={colors.paper} edge="ink" shape={5} round={1.4} style={[styles.sheet, { bottom: 10 + insets.bottom }]}>
        <View style={styles.head}>
          <Hand size={22}>{title}</Hand>
          <Pill label={picked.length ? `done · ${picked.length}` : 'done'} height={36} onPress={() => onDone(picked)} />
        </View>
        <SearchField value={q} onChange={setQ} placeholder="find people" />
        <ScrollView style={{ flex: 1, marginTop: 6 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {people.map((p) => {
            const on = picked.includes(p.id);
            return (
              <Pressable key={p.id} onPress={() => toggle(p.id)} style={styles.row} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={p.name}>
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
              {s ? 'no one by that name.' : 'once people follow you, you can add them here.'}
            </Mono>
          ) : null}
        </ScrollView>
      </Paper>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFill, backgroundColor: colors.dim },
  sheet: { position: 'absolute', left: 10, right: 10, top: 210, padding: 14, paddingTop: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
});
