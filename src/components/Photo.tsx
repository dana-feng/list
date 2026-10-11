import { useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { ItemPhoto } from '@/api/db';
import { photoUri } from '@/api/items';
import { colors, corners, swatchFor } from '@/theme';
import { Icon } from './Icon';
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

/** Swipe through photos one at a time, with "2 / 6" and dots. `peek` leaves part of the next one showing. */
export function PhotoCarousel({ photos, height, peek = 44, gap = 6, dots = true, count = true, dotColor = colors.paper }: {
  photos: PhotoLike[];
  height: number;
  peek?: number;
  gap?: number;
  dots?: boolean;
  count?: boolean;
  dotColor?: string;
}) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const tile = Math.max(1, photos.length > 1 ? width - peek : width);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (tile + gap));
    if (i !== index) setIndex(Math.max(0, Math.min(photos.length - 1, i)));
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
        contentContainerStyle={{ gap }}
        accessibilityLabel={`${photos.length} photos`}
      >
        {photos.map((p, i) => <Photo key={p.id} photo={p} shape={i} style={{ width: tile, height }} />)}
      </ScrollView> : null}
      {photos.length > 1 && count ? (
        <View style={{ position: 'absolute', top: 10, right: peek + 10, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(58,16,0,0.72)' }}>
          <Mono size={10.5} color={colors.paper}>{index + 1} / {photos.length}</Mono>
        </View>
      ) : null}
      {photos.length > 1 && dots ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: peek, bottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
          {photos.map((p, i) => <View key={p.id} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor, opacity: i === index ? 1 : 0.45 }} />)}
        </View>
      ) : null}
    </View>
  );
}
