import { TextInput, View } from 'react-native';
import { usernameAvailable } from '@/api/profiles';
import { colors, fonts, noOutline } from '@/theme';
import { Mono, SansBold } from './Text';

/** What the live check says about a username; `current` is the one you already have. */
export function usernameStatus(value: string, current?: string) {
  const v = value.trim().toLowerCase();
  if (!v || v === current) return null;
  if (!/^[a-z0-9._]+$/.test(v)) return { ok: false, text: 'letters, numbers, dots and underscores only' };
  if (v.length < 3) return { ok: false, text: 'at least 3 characters' };
  return usernameAvailable(v) ? { ok: true, text: 'available' } : { ok: false, text: 'taken' };
}

/** Input with the live available / taken message. `variant` picks the sign-up box or the settings underline. */
export function UsernameField({ value, onChange, current, variant = 'box' }: { value: string; onChange: (v: string) => void; current?: string; variant?: 'box' | 'underline' }) {
  const status = usernameStatus(value, current);
  const input = (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
      <Mono size={17} color={colors.inkSoft}>@</Mono>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.toLowerCase().replace(/\s/g, ''))}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Username"
        style={[{ flex: 1, fontFamily: fonts.mono, fontSize: 17, color: colors.ink, height: 44, marginLeft: 2 }, noOutline]}
      />
    </View>
  );
  const message = status ? (
    <SansBold size={13.5} color={status.ok ? colors.dark : colors.danger}>{variant === 'underline' ? `@${value} is ${status.text}` : status.text}</SansBold>
  ) : null;
  if (variant === 'underline') {
    return (
      <View>
        <View style={{ flexDirection: 'row', backgroundColor: colors.paper, paddingHorizontal: 8, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inkFaint }}>
          {input}
        </View>
        <View style={{ minHeight: 20, marginTop: 6 }} accessibilityLiveRegion="polite">{message}</View>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 56, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.ink }}>
      {input}
      <View accessibilityLiveRegion="polite">{message}</View>
    </View>
  );
}
