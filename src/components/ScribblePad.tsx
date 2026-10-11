import { ReactNode, useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme';
import { Point, smooth } from './Scribble';

type Props = {
  children: ReactNode;
  /** While armed, a finger drag across the card draws a line instead of scrolling. */
  armed: boolean;
  /** Called when the finger lifts: `crossed` is true when the line went most of the way across. */
  onFinish: (crossed: boolean) => void;
  style?: StyleProp<ViewStyle>;
  /** Leave this much of the left edge tappable (the circle that cancels). */
  leftGap?: number;
};

/** How far across the card the scribble has to reach to count. */
const REACH = 0.55;

const at = (e: GestureResponderEvent): Point => [e.nativeEvent.locationX, e.nativeEvent.locationY];

/**
 * "Scribble to finish": tap the circle to arm a card, then scribble across it to cross it off.
 * Draws the line live under your finger. Screens should turn off scrolling while a card is armed.
 */
export function ScribblePad({ children, armed, onFinish, style, leftGap = 0 }: Props) {
  const [pts, setPts] = useState<Point[]>([]);
  const width = useRef(1);
  const run = useRef({ pts: [] as Point[], minX: 0, maxX: 0 });

  const start = (e: GestureResponderEvent) => {
    const p = at(e);
    run.current = { pts: [p], minX: p[0], maxX: p[0] };
    setPts([p]);
  };
  const move = (e: GestureResponderEvent) => {
    const p = at(e);
    const r = run.current;
    const last = r.pts[r.pts.length - 1];
    if (!last || Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 3) return;
    r.pts = [...r.pts, p];
    r.minX = Math.min(r.minX, p[0]);
    r.maxX = Math.max(r.maxX, p[0]);
    setPts(r.pts);
  };
  const end = () => {
    const r = run.current;
    const crossed = r.pts.length > 6 && r.maxX - r.minX > width.current * REACH;
    run.current = { pts: [], minX: 0, maxX: 0 };
    setPts([]);
    onFinish(crossed);
  };
  const onLayout = (e: LayoutChangeEvent) => {
    width.current = e.nativeEvent.layout.width;
  };

  return (
    <View style={style}>
      {children}
      {armed ? (
        <View
          onLayout={onLayout}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={start}
          onResponderMove={move}
          onResponderRelease={end}
          onResponderTerminate={() => setPts([])}
          style={{ position: 'absolute', top: 0, left: leftGap, right: 0, bottom: 0 }}
          accessible={false}
        >
          <Svg width="100%" height="100%" pointerEvents="none">
            {pts.length > 1 ? (
              <Path d={smooth(pts)} fill="none" stroke={colors.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
          </Svg>
        </View>
      ) : null}
    </View>
  );
}
