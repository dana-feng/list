import { TextInput } from 'react-native';
import { colors, fonts, noOutline } from '@/theme';
import { Paper } from './Paper';
import { Hand, Mono } from './Text';

/** Notes on a cream sheet. A dashed sheet you can type on while editing. */
export function NotesField({ value, onChange, editing, placeholder = 'links, addresses, who to ask…' }: { value: string; onChange?: (v: string) => void; editing?: boolean; placeholder?: string }) {
  if (!editing) {
    return (
      <Paper fill={colors.cream} shape={3} lean={1} style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
        {value ? <Hand size={16} style={{ lineHeight: 23 }}>{value}</Hand> : <Mono size={12} color={colors.inkFaint}>no notes yet</Mono>}
      </Paper>
    );
  }
  return (
    <Paper fill={colors.cream} edge="dash" edgeWidth={1.3} shape={3} lean={1} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        accessibilityLabel="Notes"
        textAlignVertical="top"
        style={[{ fontFamily: fonts.hand, fontSize: 16, lineHeight: 23, color: colors.ink, minHeight: 92, padding: 0 }, noOutline]}
      />
    </Paper>
  );
}
