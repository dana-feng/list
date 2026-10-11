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

/** The scribble drawn over a crossed-off title. Sits on top of the text, stretched to its size. */
export function Strike({ seed, color = colors.ink, style }: { seed: number; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: -4, right: -4, top: 0, bottom: 0 }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 300 30" preserveAspectRatio="none">
        <Path d={scratch(300, 30, seed)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.85} />
      </Svg>
    </View>
  );
}

/** The hand-drawn circle you tap to start crossing something off. Filled olive once it's done (or armed). */
export function Circle({ filled, size = 28 }: { filled?: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.5 C 18 2, 21.5 6, 21 12 C 20.5 18.5, 16 21.5, 11 21 C 5.5 20.5, 2.5 16.5, 3 11 C 3.5 6, 7 3, 13.5 3.4"
        fill={filled ? colors.olive : colors.cream}
        stroke={colors.ink}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
