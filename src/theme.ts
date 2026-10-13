import { Platform, ViewStyle } from 'react-native';

// Colors, fonts and shapes taken from the "List Feed Explorations" design canvas (Final boards).
export const colors = {
  // grounds
  night: '#3A1000', // screen background
  bark: '#561B00', // dark buttons, "on" chips
  olive: '#787E31', // home tab, filled check circles, active rings
  // papers
  paper: '#FBEFA7', // folders, light buttons, text on dark
  cream: '#FFF8D6',
  sage: '#D6D79F',
  straw: '#E6E2AE',
  moss: '#C9CC8A',
  gold: '#EAD79B', // done rows and cards
  // ink
  ink: '#521709',
  inkSoft: 'rgba(82,23,9,0.75)',
  inkFaint: 'rgba(82,23,9,0.45)',
  inkTrack: 'rgba(82,23,9,0.18)',
  rule: 'rgba(82,23,9,0.3)',
  onDark: '#FBEFA7',
  onDarkSoft: 'rgba(251,239,167,0.8)',
  dim: 'rgba(40,10,0,0.62)',
} as const;

export const fonts = {
  // the display face (a soft serif). The keys are still called "hand" from when this was a handwriting font.
  hand: 'Fraunces_600SemiBold',
  handMedium: 'Fraunces_500Medium',
  handBold: 'Fraunces_700Bold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

// Web preview only: fields draw their own border, so drop the browser focus ring.
export const noOutline = Platform.select({ web: { outlineStyle: 'none' } as object, default: {} });

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

/** Card fills that rotate through rows and slips. */
export const cardFills = [colors.sage, colors.cream, colors.moss, colors.straw] as const;

/** Folder colors for lists on a profile. */
export const folderFills = [colors.paper, colors.sage, colors.straw, colors.gold, colors.moss] as const;

// Hand-cut corners: every box gets slightly different radii so nothing looks machine-made.
const CORNERS: [number, number, number, number][] = [
  [8, 5, 9, 6], [5, 9, 6, 10], [9, 6, 10, 5], [6, 10, 5, 9], [12, 8, 14, 10], [10, 13, 9, 12],
];

/** Uneven corner radii, scaled. `i` picks the shape so neighbours differ. */
export function corners(i: number, scale = 1): ViewStyle {
  const [a, b, c, d] = CORNERS[((i % CORNERS.length) + CORNERS.length) % CORNERS.length];
  return { borderTopLeftRadius: a * scale, borderTopRightRadius: b * scale, borderBottomRightRadius: c * scale, borderBottomLeftRadius: d * scale };
}

const TILTS = [-0.5, 0.4, -0.3, 0.5, -0.4, 0.3];

/** A small rotation so stacked cards look placed by hand. */
export const tilt = (i: number, scale = 1): ViewStyle => ({ transform: [{ rotate: `${TILTS[((i % TILTS.length) + TILTS.length) % TILTS.length] * scale}deg` }] });

/** Stable number from an id, for picking colors and shapes. */
export function hash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Background for someone's initial until they add a photo. */
export const tintFor = (id: string) => [colors.sage, colors.straw, colors.cream, colors.moss, colors.paper][hash(id) % 5];

/** Placeholder fill for photos and list covers until real images exist. */
export const swatchFor = (id: string) => [colors.moss, colors.straw, colors.sage, colors.cream][hash(id) % 4];

/** Height of the tab row above the safe area; screens pad their scroll content by this. */
export const TAB_BAR_HEIGHT = 52;
