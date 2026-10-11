import { ReactNode } from 'react';
import { AccessibilityActionEvent, AccessibilityActionInfo, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { colors, corners, tilt } from '@/theme';

type Edge = 'ink' | 'light' | 'dash' | 'dashLight' | 'none';

type Props = {
  children?: ReactNode;
  /** Fill color; leave out for a see-through box (an outline only). */
  fill?: string;
  /** ink: dark line · light: cream line · dash / dashLight: dashed. */
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
  dash: { color: colors.ink, style: 'dashed' },
  dashLight: { color: colors.paper, style: 'dashed' },
  none: null,
};

/** A hand-cut piece of paper: uneven corners, an optional pen line around it, a slight tilt. */
export function Paper({ children, fill, edge = 'none', edgeWidth = 1.5, shape = 0, round = 1, lean, style, onPress, disabled, ...a11y }: Props) {
  const line = EDGE[edge];
  const box: StyleProp<ViewStyle> = [
    corners(shape, round),
    fill ? { backgroundColor: fill } : null,
    line ? { borderWidth: edgeWidth, borderColor: line.color, borderStyle: line.style } : null,
    lean === undefined ? null : tilt(lean),
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [box, pressed && { opacity: 0.85 }]} accessibilityRole={a11y.accessibilityRole ?? 'button'} {...a11y}>
        {children}
      </Pressable>
    );
  }
  return <View style={box} {...a11y}>{children}</View>;
}
