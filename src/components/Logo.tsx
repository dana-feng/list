import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';

/** The two looks from the sheet: olive papers, or pale sage ones. */
const LOOKS = {
  olive: { back: colors.olive, middle: colors.sage, front: colors.olive, dots: colors.sun },
  sage: { back: colors.sage, middle: colors.cream, front: colors.sage, dots: colors.burntOrange },
} as const;

export type LogoLook = keyof typeof LOOKS;

/** echi's logo: a little stack of three papers, the front one tipped the other way with three dots down its side. */
export function Logo({ size = 64, look = 'olive', ink = colors.ink }: { size?: number; look?: LogoLook; ink?: string }) {
  const c = LOOKS[look];
  const k = { stroke: ink, strokeWidth: 2.2, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 50 40">
      <G rotation={14} origin="33, 19">
        <Rect {...k} fill={c.back} x={23} y={7} width={20} height={23} rx={1.6} />
      </G>
      <G rotation={5} origin="28, 20">
        <Rect {...k} fill={c.middle} x={17} y={8} width={21} height={24} rx={1.6} />
      </G>
      <G rotation={-20} origin="19, 22">
        <Rect {...k} fill={c.front} x={8} y={10} width={22} height={24} rx={1.6} />
        <Circle {...k} strokeWidth={1.6} fill={c.dots} cx={12.5} cy={16} r={2} />
        <Circle {...k} strokeWidth={1.6} fill={c.dots} cx={12.5} cy={22} r={2} />
        <Circle {...k} strokeWidth={1.6} fill={c.dots} cx={12.5} cy={28} r={2} />
      </G>
    </Svg>
  );
}

/** The big paint stroke behind the logo on the landing page. */
export function Swoosh({ color = colors.sun, width = 240 }: { color?: string; width?: number }) {
  return (
    <Svg width={width} height={width * 0.9} viewBox="0 0 100 90">
      <Path
        d="M30 10 C 22 18, 14 30, 22 34 C 32 38, 44 20, 52 22 C 60 24, 40 46, 46 52 C 54 58, 70 40, 78 46 C 84 50, 74 62, 70 70"
        fill="none"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.95}
      />
      <Path d="M76 74 h0.1 M82 70 h0.1 M72 80 h0.1 M86 77 h0.1 M68 84 h0.1" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
    </Svg>
  );
}
