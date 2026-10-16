import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';

export type IconName =
  | 'home' | 'plus' | 'list' | 'back' | 'right' | 'down' | 'search' | 'sliders' | 'image'
  | 'calendar' | 'people' | 'person' | 'globe' | 'lock' | 'check' | 'x' | 'pencil' | 'folder' | 'more' | 'invite'
  | 'heart' | 'heartFilled' | 'comment' | 'send' | 'bell';

const HEART = 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

/** Line icons from the design boards (24×24, round caps). */
export function Icon({ name, size = 22, color = colors.ink, strokeWidth = 1.9 }: Props) {
  const s = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'bell' && (<><Path {...s} d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2H4.4z" /><Path {...s} d="M10 21a2.2 2.2 0 0 0 4 0" /></>)}
      {name === 'home' && <Path {...s} d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />}
      {name === 'plus' && <Path {...s} d="M12 5v14M5 12h14" />}
      {name === 'list' && (<><Path {...s} d="M9 6h11M9 12h11M9 18h11" /><Circle {...s} cx={4.5} cy={6} r={1} /><Circle {...s} cx={4.5} cy={12} r={1} /><Circle {...s} cx={4.5} cy={18} r={1} /></>)}
      {name === 'back' && <Path {...s} d="M15 5l-7 7 7 7" />}
      {name === 'right' && <Path {...s} d="M9 5l7 7-7 7" />}
      {name === 'down' && <Path {...s} d="M6 9l6 6 6-6" />}
      {name === 'search' && (<><Circle {...s} cx={11} cy={11} r={7} /><Path {...s} d="M20 20l-3.5-3.5" /></>)}
      {name === 'sliders' && (<><Path {...s} d="M4 7h9M17 7h3M4 17h3M11 17h9" /><Circle {...s} cx={15} cy={7} r={2.2} /><Circle {...s} cx={9} cy={17} r={2.2} /></>)}
      {name === 'image' && (<><Rect {...s} x={3.5} y={4.5} width={17} height={15} rx={2} /><Circle {...s} cx={9} cy={10} r={1.8} /><Path {...s} d="M5 18l5-5 4 3 3-2 3 3" /></>)}
      {name === 'calendar' && (<><Rect {...s} x={3.5} y={5} width={17} height={15} rx={2} /><Path {...s} d="M3.5 10h17M8 3v4M16 3v4" /></>)}
      {name === 'people' && (<><Circle {...s} cx={9} cy={9} r={3.2} /><Path {...s} d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" /><Circle {...s} cx={17} cy={8} r={2.4} /><Path {...s} d="M16 13.2c2.3.1 4 1.6 4.5 4.3" /></>)}
      {name === 'person' && (<><Circle {...s} cx={12} cy={8.5} r={3.5} /><Path {...s} d="M5.5 19.5c.7-3.6 3.3-5.5 6.5-5.5s5.8 1.9 6.5 5.5" /></>)}
      {name === 'globe' && (<><Circle {...s} cx={12} cy={12} r={8.5} /><Path {...s} d="M3.5 12h17M12 3.5c-2.4 2.4-3.5 5.3-3.5 8.5s1.1 6.1 3.5 8.5M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5" /></>)}
      {name === 'lock' && (<><Rect {...s} x={5} y={10.5} width={14} height={9.5} rx={2} /><Path {...s} d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>)}
      {name === 'check' && <Path {...s} d="M5 12.5l4.5 4.5L19 7.5" />}
      {name === 'x' && <Path {...s} d="M6 6l12 12M18 6L6 18" />}
      {name === 'folder' && <Path {...s} d="M3.5 8c0-1.1.9-2 2-2h3.8l2 2.2h7.2c1.1 0 2 .9 2 2V17c0 1.1-.9 2-2 2h-13c-1.1 0-2-.9-2-2z" />}
      {name === 'more' && (<><Circle cx={5} cy={12} r={1.9} fill={color} /><Circle cx={12} cy={12} r={1.9} fill={color} /><Circle cx={19} cy={12} r={1.9} fill={color} /></>)}
      {name === 'invite' && (<><Circle {...s} cx={9} cy={8} r={3.6} /><Path {...s} d="M2.5 20c.5-4.5 3.5-6.5 6.5-6.5s6 2 6.5 6.5M19 8v6M16 11h6" /></>)}
      {name === 'pencil' && <Path {...s} d="M4 20l1-4L16 5l3 3L8 19z" />}
      {name === 'heart' && <Path {...s} d={HEART} />}
      {name === 'heartFilled' && <Path {...s} fill={color} d={HEART} />}
      {name === 'comment' && <Path {...s} d="M5 5h14v10H10l-4 4v-4H5z" />}
      {name === 'send' && <Path {...s} d="M12 19V5M6 11l6-6 6 6" />}
    </Svg>
  );
}
