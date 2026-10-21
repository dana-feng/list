import { Image } from 'expo-image';
import { BRAND, BRAND_CACHE } from '@/brand';
import { useScheme } from './Surface';

// echi's logo, a little stack of three papers, and the paint stroke that goes behind it on the landing page.
// Olive papers with a sage stroke in light mode, sage papers with a sun stroke in dark mode.
const LOGOS = { olive: BRAND.logoOlive, sage: BRAND.logoSage };
const SWOOSHES = {
  sage: { source: BRAND.swooshSage, ratio: 263 / 324 },
  sun: { source: BRAND.swooshSun, ratio: 410 / 433 },
};

export type LogoLook = keyof typeof LOGOS;

/** The logo, `size` wide. Leave out `look` for the one that goes with light or dark mode. */
export function Logo({ size = 64, look }: { size?: number; look?: LogoLook }) {
  const scheme = useScheme();
  return <Image source={LOGOS[look ?? scheme.logo]} style={{ width: size, height: (size * 236) / 325 }} contentFit="contain" cachePolicy={BRAND_CACHE} accessible={false} />;
}

/** The paint stroke behind the logo on the landing page, `width` wide, in the color for light or dark mode. */
export function Swoosh({ width = 240, look }: { width?: number; look?: keyof typeof SWOOSHES }) {
  const scheme = useScheme();
  const s = SWOOSHES[look ?? scheme.swoosh];
  return <Image source={s.source} style={{ width, height: width / s.ratio }} contentFit="contain" cachePolicy={BRAND_CACHE} accessible={false} />;
}
