import { Image as RNImage } from 'react-native';
import { Image } from 'expo-image';

/** The sheet's drawn art: the logo, the landing-page strokes, placeholder photos, the strike and the done box. */
export const BRAND = {
  logoOlive: require('../assets/brand/logo-olive.png'),
  logoSage: require('../assets/brand/logo-sage.png'),
  // the sage logo with cream outlines, so it shows on the dark background
  logoSageOnDark: require('../assets/brand/logo-sage-on-dark.png'),
  swooshSage: require('../assets/brand/swoosh-sage.png'),
  swooshSun: require('../assets/brand/swoosh-sun.png'),
  placeholderSun: require('../assets/brand/placeholder-sun.png'),
  placeholderBark: require('../assets/brand/placeholder-bark.png'),
  placeholderOlive: require('../assets/brand/placeholder-olive.png'),
  placeholderOrange: require('../assets/brand/placeholder-orange.png'),
  strike: require('../assets/brand/strike.png'),
  boxDone: require('../assets/brand/box-done.png'),
} as const;

/** Kept decoded in memory once loaded, so switching screens doesn't load them again. */
export const BRAND_CACHE = 'memory-disk' as const;

/**
 * Load all of it into the image cache up front (under the splash screen), so it's there the first time a screen
 * shows it. In Expo Go each one otherwise comes over Wi-Fi from the dev server when it's first drawn. Gives up after
 * `ms` rather than holding the app.
 */
export function preloadBrand(ms = 2500) {
  const uris = Object.values(BRAND).map((m) => RNImage.resolveAssetSource(m)?.uri).filter((u): u is string => !!u);
  return Promise.race([Image.prefetch(uris, BRAND_CACHE).catch(() => false), new Promise((r) => setTimeout(r, ms))]);
}
