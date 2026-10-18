import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { PHOTO_LONG_SIDE } from './limits';

/**
 * A picked photo, shrunk to PHOTO_LONG_SIDE on its long side and saved as a JPEG. A phone photo
 * is 3-5 MB as taken; this brings it to a few hundred KB. Small ones are only re-saved.
 */
async function shrink({ uri, width, height }: ImagePicker.ImagePickerAsset): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri);
    if (Math.max(width, height) > PHOTO_LONG_SIDE) {
      context.resize(width >= height ? { width: PHOTO_LONG_SIDE } : { height: PHOTO_LONG_SIDE });
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    return saved.uri;
  } catch {
    // couldn't shrink it (an odd format, say): upload it as it is rather than lose it
    return uri;
  }
}

/** Opens the photo library and returns the picked photos' URIs (empty if cancelled). `max` caps how many can be picked. */
export async function pickPhotos(multiple = true, max?: number): Promise<string[]> {
  if (max !== undefined && max <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? max ?? 0 : 1,
    quality: 0.8,
  });
  if (result.canceled) return [];
  const assets = max === undefined ? result.assets : result.assets.slice(0, max);
  return Promise.all(assets.map(shrink));
}

/** Opens the camera and returns the photo's URI, or null if cancelled or the camera isn't allowed. */
export async function takePhoto(): Promise<string | null> {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) return null;
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
  const asset = result.canceled ? undefined : result.assets[0];
  return asset ? shrink(asset) : null;
}
