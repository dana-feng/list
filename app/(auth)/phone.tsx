import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
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
      title={change ? 'new number?' : "what's your number?"}
      body={change ? "We'll text a code to the new number." : "We'll text you a code. Same flow whether you're new or coming back."}
      footer={<Button label="Text me a code" disabled={digits.length !== 10} onPress={next} />}
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={[styles.box, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <Mono size={17}>US +1</Mono>
          <Icon name="down" size={13} />
        </View>
        <TextInput
          value={format(digits)}
          onChangeText={(t) => setDigits(t.replace(/\D/g, '').slice(0, 10))}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoFocus
          placeholder="(347) 555-0148"
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Phone number"
          style={[styles.box, { flex: 1, minWidth: 0, fontFamily: fonts.mono, fontSize: 18, color: colors.ink }, noOutline]}
        />
      </View>
    </AuthStep>
  );
}

const styles = StyleSheet.create({
  box: { height: 56, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.ink },
});
