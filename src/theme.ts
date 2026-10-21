import { Platform, ViewStyle } from 'react-native';

// Colors, fonts and shapes from the echi design sheet.
export const colors = {
  // grounds
  night: '#3A1000', // screen background
  bark: '#561B00', // dark buttons, "on" chips
  olive: '#787E31', // home tab, filled check circles, active rings
  // papers
  paper: '#FBEFA7', // folders, light buttons, text on dark
  cream: '#FFF8D6',
  sage: '#D6D79F',
  almostWhite: '#F2F3E5', // the landing page
  // accents
  sun: '#DAB900', // "add" buttons, "join", switch knobs, the bell and send icons
  burntOrange: '#B66700', // filled hearts, "undo", the x icon
  // the sheet has no more papers than these; the old in-betweens now point at them
  straw: '#F2F3E5',
  moss: '#D6D79F',
  gold: '#D6D79F', // done rows and cards
  disabled: '#B09A7E', // a button you can't press yet
  // ink
  ink: '#521709',
  inkSoft: 'rgba(82,23,9,0.75)',
  inkFaint: 'rgba(82,23,9,0.45)',
  inkTrack: 'rgba(82,23,9,0.18)',
  rule: 'rgba(82,23,9,0.3)',
  onDark: '#FBEFA7',
  onDarkSoft: 'rgba(251,239,167,0.8)',
  onDarkFaint: 'rgba(251,239,167,0.5)',
  onDarkTrack: 'rgba(251,239,167,0.2)',
  onDarkRule: 'rgba(251,239,167,0.35)',
  dim: 'rgba(40,10,0,0.62)',
} as const;

export const fonts = {
  // the display face: Noto Serif Malayalam extra bold. The keys are still called "hand" from when this was a handwriting font.
  hand: 'NotoSerifMalayalam_800ExtraBold',
  handMedium: 'NotoSerifMalayalam_700Bold',
  handBold: 'NotoSerifMalayalam_900Black',
  // the typewriter: Cousine
  mono: 'Cousine_400Regular',
  monoMedium: 'Cousine_700Bold',
} as const;

/**
 * Light and dark mode, following the phone's setting: the screen's background, the big folder most screens hold their
 * content in, and which logo and paint stroke go with them. Everything else picks ink or cream to match (see Surface).
 */
export const SCHEMES = {
  light: { ground: colors.almostWhite, folder: colors.bark, logo: 'olive', swoosh: 'sage' },
  dark: { ground: colors.night, folder: colors.paper, logo: 'sage', swoosh: 'sun' },
} as const;

export type Scheme = (typeof SCHEMES)[keyof typeof SCHEMES];

/** Whether something sits on a light fill (dark ink on it) or a dark one (cream on it). */
export type Surface = 'light' | 'dark';

const DARK_FILLS: string[] = [colors.night, colors.bark, colors.olive, colors.burntOrange, colors.disabled, colors.ink, colors.dim];

/** Which surface a fill makes for what's on it. */
export const surfaceOf = (fill: string): Surface => (DARK_FILLS.includes(fill) || fill.startsWith('rgba(40') || fill.startsWith('rgba(58') ? 'dark' : 'light');

// ink and its tints on dark fills, and the cream "on dark" colors on light ones
const ON_DARK: Record<string, string> = {
  [colors.ink]: colors.paper, [colors.inkSoft]: colors.onDarkSoft, [colors.inkFaint]: colors.onDarkFaint,
  [colors.inkTrack]: colors.onDarkTrack, [colors.rule]: colors.onDarkRule,
};
const ON_LIGHT: Record<string, string> = {
  [colors.paper]: colors.ink, [colors.onDarkSoft]: colors.inkSoft, [colors.onDarkFaint]: colors.inkFaint,
  [colors.onDarkTrack]: colors.inkTrack, [colors.onDarkRule]: colors.rule,
};

/** A text, line or icon color made to show up on `surface`: ink turns cream on dark, cream turns ink on light. Anything else stays. */
export const tint = (color: string, surface: Surface) => (surface === 'dark' ? ON_DARK : ON_LIGHT)[color] ?? color;

// Web preview only: fields draw their own border, so drop the browser focus ring.
export const noOutline = Platform.select({ web: { outlineStyle: 'none' } as object, default: {} });

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

/** Card fills that rotate through rows and slips. */
export const cardFills = [colors.sage, colors.cream, colors.paper, colors.almostWhite] as const;

/** Folder colors for lists on a profile. */
export const folderFills = [colors.paper, colors.sage, colors.cream, colors.sun, colors.almostWhite] as const;

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

/** Placeholder photos: a ground and the scribble across it. */
export const SWATCHES = [
  { fill: colors.sun, stroke: colors.olive },
  { fill: colors.bark, stroke: colors.sun },
  { fill: colors.olive, stroke: colors.burntOrange },
  { fill: colors.burntOrange, stroke: colors.bark },
] as const;

/** The placeholder for a photo or list cover until a real image exists, the same every time for the same id. */
export const swatchPair = (id: string) => SWATCHES[hash(id) % SWATCHES.length];

/** Just the ground of `swatchPair`. */
export const swatchFor = (id: string) => swatchPair(id).fill;

/** Height of the tab row above the safe area; screens pad their scroll content by this. */
export const TAB_BAR_HEIGHT = 52;
