import { Platform } from 'react-native';

// Colors, fonts and spacing taken from the design canvas (simplified boards).
export const colors = {
  ink: '#2B3524',
  inkSoft: '#56604B',
  inkFaint: '#7C8570',
  dark: '#3A4630',
  cream: '#F7F2E3',
  paper: '#FFFEF2',
  folder: '#E8E6D5',
  doneCard: '#D3D3BA',
  pip: '#CBCDB2',
  gold: '#E0C56E',
  goldDeep: '#D4B24A',
  goldSoft: '#F3E3A8',
  line: 'rgba(43,53,36,0.14)',
  lineSoft: 'rgba(43,53,36,0.08)',
  danger: '#7A2E1E',
  sageTop: '#E9EED3',
  sageMid: '#B7C6A0',
  sageBottom: '#9AAE8A',
  nightTop: '#66774C',
  nightMid: '#3F4C35',
  nightBottom: '#2E3828',
  onDark: '#F7F2E3',
  onDarkSoft: 'rgba(247,242,227,0.72)',
} as const;

export const fonts = {
  serif: 'Fraunces_600SemiBold',
  serifBold: 'Fraunces_700Bold',
  sans: 'InstrumentSans_400Regular',
  sansMedium: 'InstrumentSans_500Medium',
  sansSemi: 'InstrumentSans_600SemiBold',
  sansBold: 'InstrumentSans_700Bold',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const;

// Web preview only: fields draw their own border, so drop the browser focus ring.
export const noOutline = Platform.select({ web: { outlineStyle: 'none' } as object, default: {} });

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20 } as const;

// Placeholder fills for photos and list covers until real images exist.
export const swatches = ['#8FA070', '#DAC37A', '#B5C49C', '#5F6E4E', '#C9B48E', '#9CAD80', '#D9B88F'];

export function swatchFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return swatches[h % swatches.length];
}

/** True when a fill is dark enough that text on it should be cream rather than ink. */
export function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 150;
}

// Height the folder-tab bar takes above the safe area; screens pad their scroll content by this.
export const TAB_BAR_HEIGHT = 74;
