import { Text, TextProps, TextStyle } from 'react-native';
import { colors, fonts } from '@/theme';

type Props = TextProps & { size?: number; color?: string; center?: boolean };

function make(font: string, defaultSize: number, extra?: (size: number) => TextStyle, defaultColor: string = colors.ink) {
  return function Styled({ size = defaultSize, color = defaultColor, center, style, ...rest }: Props) {
    return (
      <Text
        {...rest}
        style={[{ fontFamily: font, fontSize: size, color, textAlign: center ? 'center' : undefined }, extra?.(size), style]}
      />
    );
  };
}

/** Display sans: titles, names, big numbers. */
export const Hand = make(fonts.hand, 18, (size) => ({ lineHeight: Math.round(size * 1.15) }));
export const HandMedium = make(fonts.handMedium, 16, (size) => ({ lineHeight: Math.round(size * 1.2) }));
/** Typewriter: everything else. */
export const Mono = make(fonts.mono, 12);
export const MonoMedium = make(fonts.monoMedium, 12);
/** Small spaced-out section label: "to do", "notes", "who can see". */
export const Label = make(fonts.mono, 11, () => ({ letterSpacing: 1.4 }), colors.inkSoft);
