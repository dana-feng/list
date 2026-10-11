import { TextInput, View } from 'react-native';
import { colors, fonts, noOutline } from '@/theme';
import { Sans } from './Text';

/** Plain box in view, text area in edit. */
export function NotesField({ value, onChange, editing }: { value: string; onChange?: (v: string) => void; editing?: boolean }) {
  if (!editing) {
    if (!value) return <Sans color={colors.inkFaint}>no notes yet</Sans>;
    return (
      <View style={{ backgroundColor: 'rgba(255,254,242,0.6)', borderRadius: 14, borderWidth: 1, borderColor: colors.lineSoft, padding: 14 }}>
        <Sans size={15.5} style={{ lineHeight: 22.5 }}>{value}</Sans>
      </View>
    );
  }
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      multiline
      placeholder="anything to remember…"
      placeholderTextColor={colors.inkFaint}
      accessibilityLabel="Notes"
      textAlignVertical="top"
      style={[{
        fontFamily: fonts.sans, fontSize: 15.5, lineHeight: 22.5, color: colors.ink, minHeight: 120, padding: 14,
        backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inkFaint,
      }, noOutline]}
    />
  );
}
