import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, space } from '@/theme';
import { Mono } from './Text';

type Props = {
  /** Text or a custom node for the tab sticking up from the top-left. */
  tab: ReactNode;
  children: ReactNode;
  color?: string;
  tabColor?: string;
  padding?: number;
  onTabPress?: () => void;
  dashedTab?: boolean;
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
};

export function FolderCard({ tab, children, color = colors.folder, tabColor, padding = space.lg, onTabPress, dashedTab, style, bodyStyle }: Props) {
  const tabNode = typeof tab === 'string' ? <Mono size={12.5}>{tab}</Mono> : tab;
  return (
    <View style={style}>
      <Pressable
        disabled={!onTabPress}
        onPress={onTabPress}
        style={[styles.tab, { backgroundColor: tabColor ?? color }, dashedTab && styles.dashed]}
      >
        {tabNode}
      </Pressable>
      <View style={[styles.body, { backgroundColor: color, padding }, bodyStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tab: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 7, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  dashed: { borderWidth: 1.5, borderBottomWidth: 0, borderStyle: 'dashed', borderColor: colors.inkFaint },
  body: { borderRadius: 18, borderTopLeftRadius: 0 },
});
