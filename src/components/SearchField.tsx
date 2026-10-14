import { Pressable, TextInput } from 'react-native';
import { colors, fonts, noOutline } from '@/theme';
import { Icon } from './Icon';
import { Paper } from './Paper';

type Props = { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; tone?: 'dash' | 'paper' };

/** dash: a dashed box inside a folder. paper: the filled field on the dark background (search). */
export function SearchField({ value, onChange, placeholder, autoFocus, tone = 'dash' }: Props) {
  const paper = tone === 'paper';
  return (
    <Paper
      fill={paper ? colors.paper : colors.cream}
      edge={paper ? 'light' : 'dash'}
      shape={paper ? 5 : 4}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: paper ? 48 : 44, paddingLeft: 12, paddingRight: 6 }}
    >
      <Icon name="search" size={paper ? 17 : 16} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={placeholder ?? 'Search'}
        // The mono font's line box sits low, so lowercase text looks about 2pt below the middle
        // of the field (and below the icon). The extra bottom padding lifts it back to centre.
        style={[{ flex: 1, alignSelf: 'stretch', fontFamily: fonts.mono, fontSize: paper ? 15 : 13, color: colors.ink, paddingTop: 0, paddingBottom: 4 }, noOutline]}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Clear search">
          <Icon name="x" size={16} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </Paper>
  );
}
