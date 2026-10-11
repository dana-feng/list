import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Paper } from '@/components/Paper';
import { Mono } from '@/components/Text';
import { AuthStep } from '@/screens/AuthStep';
import { colors, fonts, noOutline } from '@/theme';

function format(digits: string) {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function Phone() {
  const { change } = useLocalSearchParams<{ change?: string }>();
  const [digits, setDigits] = useState('');
  const next = () => router.push(`/code?phone=${encodeURIComponent(format(digits))}${change ? '&change=1' : ''}`);
  return (
    <AuthStep
      step={1}
      title={change ? 'new number?' : "what's your\nnumber?"}
      body={change ? "we'll text a code to the new number." : "we'll text you a code. no passwords."}
      footer={
        <View style={{ gap: 6 }}>
          <Button label="text me a code" tone="paper" disabled={digits.length !== 10} onPress={next} />
          {change ? null : (
            <Mono size={10.5} center color={colors.onDarkSoft} style={{ marginTop: 6, lineHeight: 16 }}>by continuing you agree to the terms + privacy policy</Mono>
          )}
        </View>
      }
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Paper fill={colors.straw} shape={4} style={{ height: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel="Country code: US +1">
          <Mono size={15}>+1</Mono>
          <Icon name="down" size={13} strokeWidth={2.2} />
        </Paper>
        <Paper fill={colors.paper} shape={5} style={{ flex: 1, height: 58, paddingHorizontal: 14, justifyContent: 'center' }}>
          <TextInput
            value={format(digits)}
            onChangeText={(t) => setDigits(t.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            autoFocus
            placeholder="(347) 555-0182"
            placeholderTextColor={colors.inkFaint}
            accessibilityLabel="Phone number"
            style={[{ fontFamily: fonts.mono, fontSize: 17, letterSpacing: 0.5, color: colors.ink, height: 54 }, noOutline]}
          />
        </Paper>
      </View>
    </AuthStep>
  );
}
