import { TextInput, View } from 'react-native';
import { usernameAvailable } from '@/api/profiles';
import { colors, fonts, noOutline } from '@/theme';
import { Paper } from './Paper';
import { Mono } from './Text';

/** What the live check says about a username; `current` is the one you already have. */
export function usernameStatus(value: string, current?: string) {
  const v = value.trim().toLowerCase();
  if (!v || v === current) return null;
  if (!/^[a-z0-9._]+$/.test(v)) return { ok: false, text: 'letters, numbers, dots and underscores only' };
  if (v.length < 3) return { ok: false, text: 'at least 3 characters' };
  if (v.length > 20) return { ok: false, text: '20 characters at most' };
  return usernameAvailable(v) ? { ok: true, text: "✓ it's free" } : { ok: false, text: 'taken — try another' };
}

/** The sign-up username box: paper on the dark background, "@", and the live check under it. */
export function UsernameField({ value, onChange, current }: { value: string; onChange: (v: string) => void; current?: string }) {
  const status = usernameStatus(value, current);
  return (
    <View>
      <Paper fill={colors.paper} shape={4} round={1.2} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 54, paddingHorizontal: 14 }}>
        <Mono size={15} color={colors.inkSoft}>@</Mono>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.toLowerCase().replace(/\s/g, ''))}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Username"
          style={[{ flex: 1, fontFamily: fonts.mono, fontSize: 15, color: colors.ink, height: 50 }, noOutline]}
        />
      </Paper>
      <View style={{ minHeight: 20, marginTop: 8, marginHorizontal: 2 }} accessibilityLiveRegion="polite">
        {status ? <Mono size={11} color={colors.paper}>{status.text}</Mono> : null}
      </View>
    </View>
  );
}
