import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme';

export type Point = [number, number];

/** Smooth a run of finger points into one curved pen line. */
export function smooth(pts: Point[]) {
  const f = (n: number) => n.toFixed(1);
  if (pts.length < 3) return 'M ' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L ');
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    d += ` Q ${f(pts[i][0])} ${f(pts[i][1])} ${f((pts[i][0] + pts[i + 1][0]) / 2)} ${f((pts[i][1] + pts[i + 1][1]) / 2)}`;
  }
  const l = pts[pts.length - 1];
  return `${d} L ${f(l[0])} ${f(l[1])}`;
}

/** A made-up back-and-forth scribble, the same every time for the same seed (so a crossed-off row always looks the same). */
export function scratch(w: number, h: number, seed: number) {
  let s = Math.round(seed * 7919) % 233280 || 1;
  const r = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const pts: Point[] = [];
  let x = w * 0.03 + r() * 6;
  let top = true;
  let cy = h * 0.5;
  const end = w * (0.86 + r() * 0.08);
  pts.push([x - 4, cy + h * 0.04]);
  while (x < end) {
    x += w * (0.02 + r() * 0.016);
    const amp = h * (0.13 + r() * 0.08);
    cy = Math.min(h * 0.56, Math.max(h * 0.44, cy + (r() - 0.5) * h * 0.05));
    pts.push([x + (top ? 5 : -5), cy + (top ? -amp : amp)]);
    top = !top;
  }
  return smooth(pts);
}

/** A few flecks of paint flicked off the end of a brush stroke, as dots in a 300×30 box. */
function flecks(seed: number) {
  let s = Math.round(seed * 104729) % 233280 || 7;
  const r = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: 6 }, () => `M ${(268 + r() * 30).toFixed(1)} ${(6 + r() * 18).toFixed(1)} h 0.1`).join(' ');
}

/** The olive brush stroke drawn over a crossed-off title: a thick back-and-forth scribble, a thinner one through it, and some flecks at the end. Sits on top of the text, stretched to its size. */
export function Strike({ seed, color = colors.olive, style }: { seed: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const line = { fill: 'none', stroke: color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, vectorEffect: 'non-scaling-stroke' as const };
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: -4, right: -4, top: 0, bottom: 0 }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 300 30" preserveAspectRatio="none">
        <Path d={scratch(300, 30, seed)} {...line} strokeWidth={5.5} opacity={0.92} />
        <Path d={scratch(270, 30, seed + 13)} {...line} strokeWidth={1.6} opacity={0.75} />
        <Path d={flecks(seed)} {...line} strokeWidth={2.4} opacity={0.8} />
      </Svg>
    </View>
  );
}

/** The box you tap to start crossing something off: an ink square drawn by hand, scribbled over in olive once it's done (or armed). Still called Circle from when it was round. */
export function Circle({ filled, size = 28 }: { filled?: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 3.6 C 9 3, 15 3.3, 20.4 3.7 C 20.9 9, 20.8 15, 20.3 20.4 C 14.5 20.9, 9 20.6, 3.6 20.3 C 3.1 14.5, 3.3 9, 4 3.6 Z"
        fill={colors.cream}
        stroke={colors.ink}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {filled ? (
        <Path
          d="M6.2 9.5 L10 6.4 L6.8 12.6 L14.5 6.3 L7.4 16.6 L17.6 7.6 L10.6 18.2 L18.2 11.6 L14.6 18"
          fill="none"
          stroke={colors.olive}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  );
}
