import * as ImagePicker from 'expo-image-picker';

/** Opens the photo library and returns the picked file URIs (empty if cancelled). */
export async function pickPhotos(multiple = true): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: multiple, quality: 0.8 });
  return result.canceled ? [] : result.assets.map((a) => a.uri);
}

/** Opens the camera and returns the photo's URI, or null if cancelled or the camera isn't allowed. */
export async function takePhoto(): Promise<string | null> {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) return null;
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
  return result.canceled ? null : result.assets[0]?.uri ?? null;
}
