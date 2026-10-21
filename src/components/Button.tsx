import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { colors } from '@/theme';
import { Icon } from './Icon';
import { Paper } from './Paper';
import { MonoMedium } from './Text';

type Tone = 'bark' | 'sun' | 'paper' | 'outline' | 'outlineLight' | 'dashLight';

// as on the sheet: everything on paper gets an ink edge
const TONES: Record<Tone, { fill?: string; text: string; edge: 'none' | 'ink' | 'light' | 'dashLight' }> = {
  bark: { fill: colors.bark, text: colors.paper, edge: 'ink' },
  sun: { fill: colors.sun, text: colors.ink, edge: 'ink' },
  paper: { fill: colors.paper, text: colors.ink, edge: 'ink' },
  outline: { fill: colors.cream, text: colors.ink, edge: 'ink' },
  outlineLight: { text: colors.paper, edge: 'light' },
  dashLight: { text: colors.paper, edge: 'dashLight' },
};

type Props = {
  label: string;
  onPress: () => void;
  /** bark on paper, paper on the dark background, sun for adding something. */
  tone?: Tone;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** The full-width button: "save", "send code", "done". */
export function Button({ label, onPress, tone = 'bark', disabled, icon, style, accessibilityLabel }: Props) {
  const t = TONES[tone];
  return (
    <Paper
      onPress={onPress}
      disabled={disabled}
      fill={disabled ? colors.disabled : t.fill}
      edge={disabled ? 'none' : t.edge}
      edgeWidth={1.8}
      shape={4}
      round={1.1}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[{ height: 52, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }, style]}
    >
      {icon}
      <MonoMedium size={13} color={disabled ? colors.cream : t.text}>{label}</MonoMedium>
    </Paper>
  );
}

/**
 * The small toggle button: "i'm interested", "follow" / "following", "join".
 * Off is a dark filled pill ("follow"); on is a cream outlined one ("following").
 * With `filled`, on is sage with a check instead ("✓ you're interested"). `sun` is the yellow one, for "join".
 */
export function Pill({ label, on, filled, sun, onPress, accessibilityLabel, height = 32, light }: { label: string; on?: boolean; filled?: boolean; sun?: boolean; onPress: () => void; accessibilityLabel?: string; height?: number; light?: boolean }) {
  // "on" is normally the outline; `filled` says outright which look to draw
  const hollow = filled === undefined ? !!on : !filled;
  const checked = filled && on;
  const look = light
    ? hollow ? { fill: undefined, edge: 'light' as const, text: colors.paper } : { fill: colors.paper, edge: 'none' as const, text: colors.ink }
    : checked ? { fill: colors.sage, edge: 'ink' as const, text: colors.ink }
    : sun ? { fill: colors.sun, edge: 'ink' as const, text: colors.ink }
    : hollow ? { fill: colors.cream, edge: 'ink' as const, text: colors.ink }
    : { fill: colors.bark, edge: 'ink' as const, text: colors.paper };
  return (
    <Paper
      onPress={onPress}
      fill={look.fill}
      edge={look.edge}
      edgeWidth={1.5}
      shape={1}
      round={1.2}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!on }}
      style={{ height, paddingHorizontal: 12, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      {checked && !light ? <Icon name="check" size={12} tone="line" strokeWidth={2.6} /> : null}
      <MonoMedium size={11.5} color={look.text} numberOfLines={1}>{label}</MonoMedium>
    </Paper>
  );
}

/** A plain underlined text action: "not now", "undo", "keep it". Burnt orange for the ones that take something away. */
export function LinkText({ label, onPress, color = colors.ink, size = 12 }: { label: string; onPress: () => void; color?: string; size?: number }) {
  return (
    <Paper onPress={onPress} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 4, alignSelf: 'flex-start' }}>
      <View>
        <MonoMedium size={size} color={color} style={{ textDecorationLine: 'underline' }}>{label}</MonoMedium>
      </View>
    </Paper>
  );
}
