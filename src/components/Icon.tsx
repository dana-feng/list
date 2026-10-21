import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, tint } from '@/theme';
import { ICON_ART } from './iconArt';
import { useSurface } from './Surface';

export type IconName = keyof typeof ICON_ART;

const OUTLINE = '#3A1000';

type Props = {
  name: IconName;
  size?: number;
  /** Leave out for the icon as drawn. On a dark fill (or given a cream color) its night outline turns cream so it still shows. */
  color?: string;
  /** Kept so callers don't have to change; the drawn icons have their own line weight. */
  strokeWidth?: number;
  tone?: 'color' | 'line';
};

/** The icons from the design (src/components/iconArt.ts): colored, with a night outline, or a cream one on dark fills. */
export function Icon({ name, size = 22, color = colors.ink }: Props) {
  const surface = useSurface();
  const shown = tint(color, surface);
  // cream outline where night would disappear: on a dark fill, or when the caller asked for cream
  const outline = shown === colors.paper || shown === colors.onDarkSoft ? colors.paper : OUTLINE;
  const swap = (v: string | number | undefined) => (v === OUTLINE ? outline : v);
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {ICON_ART[name].map(({ el, fill, stroke, ...rest }, i) => {
        const props = { ...rest, fill: swap(fill) as string, stroke: swap(stroke) as string | undefined } as Record<string, string | number>;
        return el === 'path' ? <Path key={i} {...props} /> : el === 'circle' ? <Circle key={i} {...props} /> : <Rect key={i} {...props} />;
      })}
    </Svg>
  );
}
