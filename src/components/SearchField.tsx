import { Pressable, TextInput, View } from 'react-native';
import { colors, fonts, noOutline } from '@/theme';
import { Icon } from './Icon';

export function SearchField({ value, onChange, placeholder, autoFocus, strong }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: strong ? colors.ink : 'rgba(43,53,36,0.3)' }}>
      <Icon name="search" size={18} color={colors.inkSoft} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={placeholder ?? 'Search'}
        style={[{ flex: 1, fontFamily: fonts.sans, fontSize: 16, color: colors.ink, height: 44 }, noOutline]}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityLabel="Clear search">
          <Icon name="x" size={16} color={colors.inkSoft} />
        </Pressable>
      ) : null}
    </View>
  );
}
