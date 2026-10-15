import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ItemPhoto } from '@/api/db';
import { colors, tilt } from '@/theme';
import { Icon } from './Icon';
import { Paper } from './Paper';
import { Photo } from './Photo';
import { PhotoViewer } from './PhotoViewer';
import { Mono, MonoMedium } from './Text';

type Props = { photos: Pick<ItemPhoto, 'id' | 'path'>[]; onAdd?: () => void; onRemove?: (id: string) => void; height?: number };

const WIDTHS = [196, 150, 120, 170];

/** A row of photos you scroll sideways, slightly tilted; tap one to see it big. A dashed "add photo" tile at the end when you can add. */
export function PhotoStrip({ photos, onAdd, onRemove, height = 132 }: Props) {
  const [viewing, setViewing] = useState<number | null>(null);
  if (!photos.length && !onAdd) return null;
  return (
    <>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={{ marginHorizontal: -4 }}>
      {photos.map((p, i) => (
        <View key={p.id} style={[{ width: WIDTHS[i % WIDTHS.length], height }, tilt(i, 1.4)]}>
          <Pressable onPress={() => setViewing(i)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`View photo ${i + 1}`}>
            <Photo photo={p} shape={i} style={{ flex: 1 }} />
          </Pressable>
          {onRemove ? (
            <Pressable onPress={() => onRemove(p.id)} style={styles.remove} accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`}>
              <View style={styles.removeDot}><Icon name="x" size={13} color={colors.paper} strokeWidth={2.6} /></View>
            </Pressable>
          ) : null}
        </View>
      ))}
      {onAdd ? (
        <Paper onPress={onAdd} edge="dash" shape={1} accessibilityLabel="Add a photo" style={[styles.add, { height: photos.length ? height : 92, width: 92 }]}>
          <MonoMedium size={22} style={{ lineHeight: 24 }}>+</MonoMedium>
          <Mono size={11}>{photos.length ? 'add photo' : 'photo'}</Mono>
        </Paper>
      ) : null}
    </ScrollView>
    <PhotoViewer photos={photos} start={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingHorizontal: 6, paddingTop: 10, paddingBottom: 4 },
  add: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  remove: { position: 'absolute', top: -9, right: -9, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  removeDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.bark, alignItems: 'center', justifyContent: 'center' },
});
