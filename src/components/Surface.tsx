import { createContext, ReactNode, useContext } from 'react';
import { GROUND, Surface as Kind, surfaceOf, tint } from '@/theme';

const SurfaceContext = createContext<Kind>(surfaceOf(GROUND));

/** Says what's underneath its children, so their text, lines and icons pick ink or cream to match. Paper sets it from its fill; use this for plain colored views. */
export function Surface({ tone, fill, children }: { tone?: Kind; fill?: string; children: ReactNode }) {
  const parent = useContext(SurfaceContext);
  return <SurfaceContext.Provider value={tone ?? (fill ? surfaceOf(fill) : parent)}>{children}</SurfaceContext.Provider>;
}

export const useSurface = () => useContext(SurfaceContext);

/** `color`, made to show up on whatever this is drawn on. */
export const useTint = (color: string) => tint(color, useSurface());
