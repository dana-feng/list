import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { colors } from '@/theme';
import { MonoMedium } from './Text';

type Props = {
  label: ReactNode;
  /** The open tab is paper and joins the folder; a closed one is a cream outline on the dark background. */
  on?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  tab?: boolean;
};

/** A tab sticking up from the top edge of the big folder. */
export function FolderTab({ label, on = true, onPress, accessibilityLabel, tab }: Props) {
  const body = (
    <View
      style={{
        height: 44, paddingHorizontal: 16, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
        borderTopLeftRadius: 12, borderTopRightRadius: 15, borderWidth: 1.5, borderBottomWidth: 0, borderColor: colors.paper,
        backgroundColor: on ? colors.paper : 'transparent', marginBottom: on ? -1 : 0, maxWidth: 330,
      }}
    >
      {typeof label === 'string' ? <MonoMedium size={12.5} color={on ? colors.ink : colors.paper} numberOfLines={1}>{label}</MonoMedium> : label}
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
