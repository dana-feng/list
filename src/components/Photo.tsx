import { ReactNode, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { ItemPhoto } from '@/api/db';
import { photoUri } from '@/api/items';
import { colors, corners, swatchFor } from '@/theme';
import { Icon } from './Icon';
import { PhotoViewer } from './PhotoViewer';
import { Mono } from './Text';

type PhotoLike = Pick<ItemPhoto, 'id' | 'path'>;

/** A photo, or a flat paper block with a picture icon while there's no file yet. */
export function Photo({ photo, style, shape = 1 }: { photo: PhotoLike | { id: string; path: null }; style?: StyleProp<ViewStyle>; shape?: number }) {
  const uri = photo.path ? photoUri(photo.path) : undefined;
  const box = [corners(shape), { overflow: 'hidden' as const, backgroundColor: swatchFor(photo.id) }, style];
  if (uri) {
    return (
      <View style={box}>
        <Image source={{ uri }} style={{ flex: 1 }} contentFit="cover" transition={150} />
      </View>
    );
  }
  return (
    <View style={[...box, { alignItems: 'center', justifyContent: 'center' }]}>
      <Icon name="image" size={22} />
    </View>
  );
}

/** Space above the photos for the × that sits across their top corner. */
const REMOVE_ROOM = 14;

/**
 * Swipe through photos one at a time, with "2 / 6" and dots. Tap one to see it big. `peek` leaves part of the next one showing.
 * `last` draws one more tile after the photos, the same size: the "add photos" slot.
 * `onRemove` puts an × on the top corner of each photo, half on it and half off.
 */
export function PhotoCarousel({ photos, height, peek = 44, gap = 6, dots = true, count = true, dotColor = colors.paper, last, onRemove }: {
  photos: PhotoLike[];
  height: number;
  peek?: number;
  gap?: number;
  dots?: boolean;
  count?: boolean;
  dotColor?: string;
  last?: (size: { width: number; height: number }) => ReactNode;
  onRemove?: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const [viewing, setViewing] = useState<number | null>(null);
  const tiles = photos.length + (last ? 1 : 0);
  const tile = Math.max(1, tiles > 1 ? width - peek : width);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (tile + gap));
    if (i !== index) setIndex(Math.max(0, Math.min(tiles - 1, i)));
  };
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ minHeight: height }}>
      {width ? <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={tile + gap}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={{ gap, paddingTop: onRemove ? REMOVE_ROOM : 0 }}
        accessibilityLabel={`${photos.length} photos`}
      >
        {photos.map((p, i) => (
          <View key={p.id}>
            <Pressable onPress={() => setViewing(i)} accessibilityRole="button" accessibilityLabel={`View photo ${i + 1}`}>
              <Photo photo={p} shape={i} style={{ width: tile, height }} />
            </Pressable>
            {onRemove ? (
              <Pressable onPress={() => onRemove(p.id)} style={{ position: 'absolute', top: -22, right: -22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`}>
                <Icon name="x" size={24} color={colors.olive} strokeWidth={3.2} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {last?.({ width: tile, height })}
      </ScrollView> : null}
      {photos.length > 1 && count ? (
        <View style={{ position: 'absolute', top: 10, right: peek + 10, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(58,16,0,0.72)' }}>
          <Mono size={10.5} color={colors.paper}>{Math.min(index + 1, photos.length)} / {photos.length}</Mono>
        </View>
      ) : null}
      {tiles > 1 && dots ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: peek, bottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
          {Array.from({ length: tiles }, (_, i) => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor, opacity: i === index ? 1 : 0.45 }} />)}
        </View>
      ) : null}
      <PhotoViewer photos={photos} start={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}
