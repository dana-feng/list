import { createContext, ReactNode, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { SCHEMES, Surface as Kind, surfaceOf, tint } from '@/theme';

const SurfaceContext = createContext<Kind>('light');

/** Light or dark mode, from the phone's setting: the background, folder, logo and paint stroke to use. */
export const useScheme = () => SCHEMES[useColorScheme() === 'dark' ? 'dark' : 'light'];

/** Says what's underneath its children, so their text, lines and icons pick ink or cream to match. Paper sets it from its fill; use this for plain colored views. */
export function Surface({ tone, fill, children }: { tone?: Kind; fill?: string; children: ReactNode }) {
  const parent = useContext(SurfaceContext);
  return <SurfaceContext.Provider value={tone ?? (fill ? surfaceOf(fill) : parent)}>{children}</SurfaceContext.Provider>;
}

/** The screen's background, as the surface for everything on it. Once, at the root. */
export function GroundSurface({ children }: { children: ReactNode }) {
  return <Surface fill={useScheme().ground}>{children}</Surface>;
}

export const useSurface = () => useContext(SurfaceContext);

/** `color`, made to show up on whatever this is drawn on. */
export const useTint = (color: string) => tint(color, useSurface());
