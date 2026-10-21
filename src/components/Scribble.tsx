import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '@/theme';

/** The olive brush stroke drawn over a crossed-off title, stretched across it. */
export function Strike({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: -6, right: -10, top: '8%', bottom: '4%' }, style]}>
      <Image source={STRIKE} style={{ flex: 1 }} contentFit="fill" accessible={false} />
    </View>
  );
}

const STRIKE = require('../../assets/brand/strike.png');
const BOX_DONE = require('../../assets/brand/box-done.png');
/** The done box's shape: wider than tall, like the drawing. */
const BOX_RATIO = 334 / 277;

/**
 * The box you tap to start crossing something off: an ink square drawn by hand, scribbled over in olive once it's done
 * (or armed). Still called Circle from when it was round. `size` is its height.
 */
export function Circle({ filled, size = 28 }: { filled?: boolean; size?: number }) {
  const width = size * BOX_RATIO;
  return (
    <View style={{ width, height: size }}>
      <Svg width={width} height={size} viewBox="0 0 334 277" style={StyleSheet.absoluteFill}>
        <Rect x={14} y={14} width={306} height={249} rx={26} fill={colors.cream} stroke={colors.night} strokeWidth={26} />
      </Svg>
      {filled ? <Image source={BOX_DONE} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} /> : null}
    </View>
  );
}
