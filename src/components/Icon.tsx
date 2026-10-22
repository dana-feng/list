import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';
import { ICON_ART } from './iconArt';
import { useSurface } from './Surface';

export type IconName = keyof typeof ICON_ART;

type Props = {
  name: IconName;
  size?: number;
  /** The icons are always drawn as designed; cream (`colors.paper`) just asks for the rim used on dark fills. */
  color?: string;
  strokeWidth?: number;
  tone?: 'color' | 'line';
};

const draw = (el: string, key: string, props: Record<string, string | number>) =>
  el === 'path' ? <Path key={key} {...props} /> : el === 'circle' ? <Circle key={key} {...props} /> : <Rect key={key} {...props} />;

/**
 * The icons from the design (src/components/iconArt.ts), exactly as drawn. On a dark fill their night outline would
 * vanish, so there a thin cream rim goes around the outside first, like a sticker's edge; the drawing itself is untouched.
 */
export function Icon({ name, size = 22, color }: Props) {
  const surface = useSurface();
  const onDark = surface === 'dark' || color === colors.paper;
  const parts = ICON_ART[name].map(({ el, ...rest }) => ({ el, props: rest as Record<string, string | number> }));
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {onDark
        ? parts.map(({ el, props }, i) =>
            draw(el, `rim${i}`, { ...props, fill: props.fill === 'none' ? 'none' : colors.paper, stroke: colors.paper, strokeWidth: Number(props.strokeWidth ?? 0) + 2.6, strokeLinejoin: 'round', strokeLinecap: 'round' }),
          )
        : null}
      {parts.map(({ el, props }, i) => draw(el, `art${i}`, props))}
    </Svg>
  );
}
