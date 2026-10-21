import { ReactNode } from 'react';
import { AccessibilityActionEvent, AccessibilityActionInfo, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { colors, corners, surfaceOf, tilt, tint } from '@/theme';
import { Surface, useSurface } from './Surface';

type Edge = 'ink' | 'light' | 'olive' | 'dash' | 'dashLight' | 'none';

type Props = {
  children?: ReactNode;
  /** Fill color; leave out for a see-through box (an outline only). */
  fill?: string;
  /** ink: dark line · light: cream line · olive: green line · dash / dashLight: dashed. */
  edge?: Edge;
  edgeWidth?: number;
  /** Which hand-cut corner shape to use. */
  shape?: number;
  /** Corner size multiplier. */
  round?: number;
  /** Which tilt to use; leave out to keep it straight. */
  lean?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'switch' | 'tab' | 'checkbox';
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean; expanded?: boolean };
  disabled?: boolean;
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (e: AccessibilityActionEvent) => void;
};

const EDGE: Record<Edge, { color: string; style: 'solid' | 'dashed' } | null> = {
  ink: { color: colors.ink, style: 'solid' },
  light: { color: colors.paper, style: 'solid' },
  olive: { color: colors.olive, style: 'solid' },
  dash: { color: colors.ink, style: 'dashed' },
  dashLight: { color: colors.paper, style: 'dashed' },
  none: null,
};

/**
 * A hand-cut piece of paper: uneven corners, an optional pen line around it, a slight tilt.
 * Its line is drawn to show up on what it sits on (an ink line turns cream on the dark folder), and what's on it matches its fill.
 */
export function Paper({ children, fill, edge = 'none', edgeWidth = 1.5, shape = 0, round = 1, lean, style, onPress, disabled, ...a11y }: Props) {
  const under = useSurface();
  const line = EDGE[edge];
  // a light card keeps its ink line; a dark or see-through one takes its line from what's under it
  const lineColor = line ? tint(line.color, fill && surfaceOf(fill) === 'light' ? 'light' : under) : undefined;
  const box: StyleProp<ViewStyle> = [
    corners(shape, round),
    fill ? { backgroundColor: fill } : null,
    line ? { borderWidth: edgeWidth, borderColor: lineColor, borderStyle: line.style } : null,
    lean === undefined ? null : tilt(lean),
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [box, pressed && { opacity: 0.85 }]} accessibilityRole={a11y.accessibilityRole ?? 'button'} {...a11y}>
        <Surface fill={fill}>{children}</Surface>
      </Pressable>
    );
  }
  return <View style={box} {...a11y}><Surface fill={fill}>{children}</Surface></View>;
}
