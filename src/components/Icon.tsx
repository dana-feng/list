import Svg, { Circle, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { colors } from '@/theme';

export type IconName =
  | 'home' | 'plus' | 'x' | 'list' | 'search' | 'star' | 'plane' | 'back' | 'right' | 'down'
  | 'settings' | 'image' | 'calendar' | 'camera' | 'check' | 'folder' | 'square';

type Props = { name: IconName; size?: number; color?: string; fill?: string; strokeWidth?: number };

const GEAR =
  'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z';

export function Icon({ name, size = 22, color = colors.ink, fill = 'none', strokeWidth = 2 }: Props) {
  const s = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'home' && (<><Path {...s} d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><Path {...s} fill="none" d="M9 22V12h6v10" /></>)}
      {name === 'plus' && <Path {...s} d="M12 5v14M5 12h14" />}
      {name === 'x' && <Path {...s} d="M18 6L6 18M6 6l12 12" />}
      {name === 'list' && <Path {...s} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />}
      {name === 'search' && (<><Circle {...s} cx={11} cy={11} r={8} /><Path {...s} d="M21 21l-4.35-4.35" /></>)}
      {name === 'star' && <Polygon {...s} points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />}
      {name === 'plane' && <Polygon {...s} points="3 11 22 2 13 21 11 13 3 11" />}
      {name === 'back' && <Path {...s} d="M15 18l-6-6 6-6" />}
      {name === 'right' && <Path {...s} d="M9 18l6-6-6-6" />}
      {name === 'down' && <Path {...s} d="M6 9l6 6 6-6" />}
      {name === 'settings' && (<><Circle {...s} cx={12} cy={12} r={3} /><Path {...s} d={GEAR} /></>)}
      {name === 'image' && (<><Rect {...s} x={3} y={3} width={18} height={18} rx={3} /><Circle {...s} cx={8.5} cy={8.5} r={1.5} /><Polyline {...s} points="21 15 16 10 5 21" /></>)}
      {name === 'calendar' && (<><Rect {...s} x={3} y={4} width={18} height={18} rx={2} /><Path {...s} d="M16 2v4M8 2v4M3 10h18" /></>)}
      {name === 'camera' && (<><Path {...s} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><Circle {...s} cx={12} cy={13} r={4} /></>)}
      {name === 'check' && <Path {...s} d="M20 6L9 17l-5-5" />}
      {name === 'folder' && <Path {...s} d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />}
      {name === 'square' && <Rect {...s} x={3} y={3} width={18} height={18} rx={4} />}
    </Svg>
  );
}
