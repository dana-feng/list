import { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { colors, FOLDER } from '@/theme';
import { Surface } from './Surface';
import { MonoMedium } from './Text';

type Props = {
  label: ReactNode;
  /** The open tab is the folder's color and joins it; a closed one is an outline on the background. */
  on?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  tab?: boolean;
  /** How open it is, 0 to 1, following a drag between tabs (SwipeTabs): the folder color fades in as it opens. */
  open?: Animated.AnimatedInterpolation<number>;
};

/** A tab sticking up from the top edge of the big folder. */
export function FolderTab({ label, on = true, onPress, accessibilityLabel, tab, open }: Props) {
  const text = typeof label === 'string' ? <MonoMedium size={12.5} color={colors.ink} numberOfLines={1}>{label}</MonoMedium> : label;
  // the words on the open tab: ink, made to show up on the folder's color
  const onFolder = <Surface fill={FOLDER}>{text}</Surface>;
  const body = (
    <View
      style={{
        height: 44, paddingHorizontal: 16, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
        borderTopLeftRadius: 12, borderTopRightRadius: 15, borderWidth: 1.5, borderBottomWidth: 0, borderColor: FOLDER,
        backgroundColor: on && !open ? FOLDER : 'transparent', marginBottom: on ? -1 : 0, maxWidth: 330,
      }}
    >
      {open ? (
        <>
          {/* the folder color and its words fade in over the closed look as the tab opens */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.folder, { opacity: open }]} />
          {text}
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: open }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {onFolder}
          </Animated.View>
        </>
      ) : on ? onFolder : text}
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
  folder: { backgroundColor: FOLDER, borderTopLeftRadius: 10, borderTopRightRadius: 13 },
  center: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
