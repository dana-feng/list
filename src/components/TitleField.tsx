import { TextInput, View } from 'react-native';
import { colors, fonts, noOutline } from '@/theme';
import { Serif } from './Text';

type Props = { value: string; onChange?: (v: string) => void; editing?: boolean; placeholder?: string; size?: number; autoFocus?: boolean };

/** Big title: text in view mode, dashed-underline input in edit. */
export function TitleField({ value, onChange, editing, placeholder, size = 28, autoFocus }: Props) {
  if (!editing) return <Serif size={size} style={{ lineHeight: size * 1.12 }}>{value}</Serif>;
  return (
    <View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inkFaint }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        autoFocus={autoFocus}
        accessibilityLabel={placeholder ?? 'Title'}
        style={[{ fontFamily: fonts.serif, fontSize: size, color: colors.ink, paddingHorizontal: 6, paddingVertical: 4, letterSpacing: -0.3 }, noOutline]}
      />
    </View>
  );
}
