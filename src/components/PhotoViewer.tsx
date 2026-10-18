import { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ItemPhoto } from '@/api/db';
import { photoUri } from '@/api/items';
import { getProfile } from '@/api/profiles';
import { monthDay, names } from '@/lib';
import { colors } from '@/theme';
import { Icon } from './Icon';
import { Mono } from './Text';

/** `added_by`, when known, shows as "added by dana" under the photo. */
type PhotoLike = Pick<ItemPhoto, 'id' | 'path'> & Partial<Pick<ItemPhoto, 'added_by' | 'created_at'>>;

/** Photos full screen, starting at `start`. Swipe between them, pinch to zoom in (iOS), × to close. */
export function PhotoViewer({ photos, start, onClose }: { photos: PhotoLike[]; start: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const visible = start !== null && photos.length > 0;
  const first = Math.min(start ?? 0, photos.length - 1);
  // who added the one on screen
  const current = photos[index];
  const addedBy = current?.added_by ? getProfile(current.added_by) : undefined;
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onShow={() => setIndex(first)} onRequestClose={onClose}>
      <View style={styles.dim} accessibilityViewIsModal>
        {visible ? (
          <FlatList
            data={photos}
            keyExtractor={(p) => p.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={first}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item, index: i }) => (
              <ScrollView
                style={{ width, height }}
                contentContainerStyle={{ width, height }}
                maximumZoomScale={4}
                minimumZoomScale={1}
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri: photoUri(item.path) }}
                  style={{ width, height }}
                  contentFit="contain"
                  transition={150}
                  accessibilityLabel={`Photo ${i + 1} of ${photos.length}`}
                />
              </ScrollView>
            )}
          />
        ) : null}
        {addedBy ? (
          <View style={[styles.byline, { bottom: insets.bottom + 24 }]} pointerEvents="none">
            <Mono size={11} color={colors.paper}>added by {names([addedBy])}{current?.created_at ? ` · ${monthDay(current.created_at)}` : ''}</Mono>
          </View>
        ) : null}
        {photos.length > 1 ? (
          <View style={[styles.count, { top: insets.top + 18 }]} pointerEvents="none">
            <Mono size={11} color={colors.paper}>{index + 1} / {photos.length}</Mono>
          </View>
        ) : null}
        <Pressable onPress={onClose} hitSlop={10} style={[styles.close, { top: insets.top + 8 }]} accessibilityRole="button" accessibilityLabel="Close photo">
          <View style={styles.closeDot}><Icon name="x" size={18} color={colors.paper} strokeWidth={2.6} /></View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(40,10,0,0.96)' },
  count: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  byline: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  close: { position: 'absolute', right: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bark, alignItems: 'center', justifyContent: 'center' },
});
