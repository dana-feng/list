import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { commit, db } from '@/api/db';
import { Mono, SansBold } from '@/components/Text';
import { AuthStep } from '@/screens/AuthStep';
import { colors } from '@/theme';

const RESEND_AFTER = 30;

export default function Code() {
  const { phone, change } = useLocalSearchParams<{ phone: string; change?: string }>();
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(RESEND_AFTER);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const onChange = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, 6);
    setCode(next);
    if (next.length < 6) return;
    // mock: any six digits pass. The real check is supabase.auth.verifyOtp.
    if (change) {
      db.phone = phone;
      commit();
      router.dismissTo('/settings');
    } else {
      router.push('/profile');
    }
  };

  return (
    <AuthStep step={2} title="enter the code" body={`Sent to ${phone}`}>
      <Pressable onPress={() => input.current?.focus()} style={{ flexDirection: 'row', gap: 8 }} accessibilityLabel="6-digit code">
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[styles.box, i === code.length && styles.active]}>
            <SansBold size={24}>{code[i] ?? ''}</SansBold>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={input}
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        caretHidden
        accessibilityLabel="6-digit code"
        style={styles.hidden}
      />
      {wait > 0 ? (
        <Mono size={13} color={colors.inkSoft} style={{ marginTop: 20 }}>resend in 0:{String(wait).padStart(2, '0')}</Mono>
      ) : (
        <Pressable onPress={() => setWait(RESEND_AFTER)} style={{ marginTop: 20 }} accessibilityRole="button">
          <SansBold>Resend code</SansBold>
        </Pressable>
      )}
    </AuthStep>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, height: 58, borderRadius: 14, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: 'rgba(43,53,36,0.35)', alignItems: 'center', justifyContent: 'center' },
  active: { borderWidth: 2, borderColor: colors.ink },
  hidden: { position: 'absolute', opacity: 0, height: 58, width: '100%' },
});
