import { Text, TextProps, TextStyle } from 'react-native';
import { colors, fonts } from '@/theme';

type Props = TextProps & { size?: number; color?: string; center?: boolean };

function make(defaultFont: string, defaultSize: number, extra?: TextStyle) {
  return function Styled({ size = defaultSize, color = colors.ink, center, style, ...rest }: Props & { font?: string }) {
    return (
      <Text
        {...rest}
        style={[{ fontFamily: defaultFont, fontSize: size, color, textAlign: center ? 'center' : undefined }, extra, style]}
      />
    );
  };
}

export const Serif = make(fonts.serif, 22, { letterSpacing: -0.3 });
export const Sans = make(fonts.sans, 15);
export const SansBold = make(fonts.sansSemi, 15);
export const Mono = make(fonts.mono, 12);
