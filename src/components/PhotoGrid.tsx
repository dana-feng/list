import { Pressable, StyleSheet, View } from 'react-native';
import type { ItemPhoto } from '@/api/db';
import { colors, space } from '@/theme';
import { Icon } from './Icon';
import { Photo } from './Photo';
import { SansBold, Serif } from './Text';

type Props = { photos: Pick<ItemPhoto, 'id' | 'path'>[]; onAdd?: () => void; onRemove?: (id: string) => void };

/** Big first photo + smaller ones; add tile when you're allowed to add. */
export function PhotoGrid({ photos, onAdd, onRemove }: Props) {
  if (photos.length === 0) {
    if (!onAdd) return null;
    return (
      <Pressable onPress={onAdd} style={[styles.empty, styles.dashed]} accessibilityRole="button" accessibilityLabel="Add photos">
        <Icon name="image" size={26} />
        <SansBold>+ add photos</SansBold>
      </Pressable>
    );
  }
  const [first, ...rest] = photos;
  const tiles = [...rest.map((p) => ({ kind: 'photo' as const, p })), ...(onAdd ? [{ kind: 'add' as const }] : [])];
  const rows: (typeof tiles)[] = [];
  for (let i = 0; i < tiles.length; i += 3) rows.push(tiles.slice(i, i + 3));
  return (
    <View style={{ gap: space.sm }}>
      <Removable id={first.id} onRemove={onRemove}>
        <Photo photo={first} label style={{ width: '100%', aspectRatio: 1.43 }} />
      </Removable>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: space.sm }}>
          {row.map((t) =>
            t.kind === 'photo' ? (
              <View key={t.p.id} style={{ flex: 1 }}>
                <Removable id={t.p.id} onRemove={onRemove}>
                  <Photo photo={t.p} radius={12} style={{ aspectRatio: row.length < 3 && !onAdd ? 1.45 : 1 }} />
                </Removable>
              </View>
            ) : (
              <Pressable key="add" onPress={onAdd} style={[styles.add, styles.dashed]} accessibilityRole="button" accessibilityLabel="Add photos">
                <Serif size={24}>+</Serif>
              </Pressable>
            ),
          )}
          {onAdd ? Array.from({ length: 3 - row.length }, (_, i) => <View key={`pad${i}`} style={{ flex: 1 }} />) : null}
        </View>
      ))}
    </View>
  );
}

function Removable({ id, onRemove, children }: { id: string; onRemove?: (id: string) => void; children: React.ReactNode }) {
  return (
    <View>
      {children}
      {onRemove ? (
        <Pressable onPress={() => onRemove(id)} hitSlop={8} style={styles.remove} accessibilityRole="button" accessibilityLabel="Remove photo">
          <Icon name="x" size={14} color={colors.onDark} strokeWidth={3} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dashed: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ink },
  empty: { height: 190, borderRadius: 16, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  add: { flex: 1, aspectRatio: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  remove: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(43,53,36,0.75)', alignItems: 'center', justifyContent: 'center' },
});
