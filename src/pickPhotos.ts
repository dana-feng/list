import * as ImagePicker from 'expo-image-picker';

/** Opens the photo library and returns the picked file URIs (empty if cancelled). */
export async function pickPhotos(multiple = true): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: multiple, quality: 0.8 });
  return result.canceled ? [] : result.assets.map((a) => a.uri);
}
