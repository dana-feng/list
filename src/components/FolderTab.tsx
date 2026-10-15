import { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';
import { MonoMedium } from './Text';

type Props = {
  label: ReactNode;
  /** The open tab is paper and joins the folder; a closed one is a cream outline on the dark background. */
  on?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  tab?: boolean;
  /** How open it is, 0 to 1, following a drag between tabs (SwipeTabs): the paper fades in as it opens. */
  open?: Animated.AnimatedInterpolation<number>;
};

/** A tab sticking up from the top edge of the big folder. */
export function FolderTab({ label, on = true, onPress, accessibilityLabel, tab, open }: Props) {
  const text = (color: string) => (typeof label === 'string' ? <MonoMedium size={12.5} color={color} numberOfLines={1}>{label}</MonoMedium> : label);
  const body = (
    <View
      style={{
        height: 44, paddingHorizontal: 16, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
        borderTopLeftRadius: 12, borderTopRightRadius: 15, borderWidth: 1.5, borderBottomWidth: 0, borderColor: colors.paper,
        backgroundColor: on && !open ? colors.paper : 'transparent', marginBottom: on ? -1 : 0, maxWidth: 330,
      }}
    >
      {open ? (
        <>
          {/* paper and dark words fade in over the closed look as the tab opens */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.paper, { opacity: open }]} />
          {text(colors.paper)}
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: open }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {text(colors.ink)}
          </Animated.View>
        </>
      ) : (
        text(on ? colors.ink : colors.paper)
      )}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={tab ? 'tab' : 'button'}
      accessibilityState={tab ? { selected: on } : undefined}
      accessibilityLabel={accessibilityLabel}
      style={{ alignSelf: 'flex-end' }}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  paper: { backgroundColor: colors.paper, borderTopLeftRadius: 10, borderTopRightRadius: 13 },
  center: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
