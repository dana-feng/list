import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { colors } from '@/theme';
import { Paper } from './Paper';
import { MonoMedium } from './Text';

type Tone = 'bark' | 'paper' | 'outline' | 'outlineLight' | 'dashLight';

const TONES: Record<Tone, { fill?: string; text: string; edge: 'none' | 'ink' | 'light' | 'dashLight' }> = {
  bark: { fill: colors.bark, text: colors.paper, edge: 'none' },
  paper: { fill: colors.paper, text: colors.ink, edge: 'none' },
  outline: { text: colors.ink, edge: 'ink' },
  outlineLight: { text: colors.paper, edge: 'light' },
  dashLight: { text: colors.paper, edge: 'dashLight' },
};

type Props = {
  label: string;
  onPress: () => void;
  /** bark on paper, paper on the dark background. */
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
      fill={t.fill}
      edge={t.edge}
      shape={4}
      round={1.1}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[{ height: 52, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, opacity: disabled ? 0.45 : 1 }, style]}
    >
      {icon}
      <MonoMedium size={13} color={t.text}>{label}</MonoMedium>
    </Paper>
  );
}

/**
 * The small toggle button: "interested", "follow" / "following", "join".
 * Off is a dark filled pill; on is an outlined one.
 */
export function Pill({ label, on, filled, onPress, accessibilityLabel, height = 32, light }: { label: string; on?: boolean; filled?: boolean; onPress: () => void; accessibilityLabel?: string; height?: number; light?: boolean }) {
  const ink = light ? colors.paper : colors.ink;
  // "on" is normally the outline; `filled` says outright which look to draw
  const hollow = filled === undefined ? !!on : !filled;
  return (
    <Paper
      onPress={onPress}
      fill={hollow ? undefined : light ? colors.paper : colors.bark}
      edge={hollow ? (light ? 'light' : 'ink') : 'none'}
      edgeWidth={1.3}
      shape={1}
      round={1.2}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!on }}
      style={{ height, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <MonoMedium size={11.5} color={hollow ? ink : light ? colors.ink : colors.paper} numberOfLines={1}>{label}</MonoMedium>
    </Paper>
  );
}

/** A plain underlined text action: "not now", "undo", "show all 6 done". */
export function LinkText({ label, onPress, color = colors.ink, size = 12 }: { label: string; onPress: () => void; color?: string; size?: number }) {
  return (
    <Paper onPress={onPress} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 4, alignSelf: 'flex-start' }}>
      <View>
        <MonoMedium size={size} color={color} style={{ textDecorationLine: 'underline' }}>{label}</MonoMedium>
      </View>
    </Paper>
  );
}
