import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { commit, db } from '@/api/db';
import { supabase } from '@/api/supabase';
import { signInWithCode } from '@/api/sync';
import { Button, LinkText } from '@/components/Button';
import { Hand, Mono } from '@/components/Text';
import { AuthStep } from '@/screens/AuthStep';
import { colors, corners } from '@/theme';
import { useTint } from '@/components/Surface';

const RESEND_AFTER = 30;

export default function Code() {
  const ink = useTint(colors.ink);
  const { phone, change } = useLocalSearchParams<{ phone: string; change?: string }>();
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(RESEND_AFTER);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const input = useRef<TextInput>(null);
  const digits = (phone ?? '').replace(/\D/g, '');

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (value: string) => {
    setBusy(true);
    setProblem(null);
    if (change) {
      // v0: no texts, so the new number is saved straight away.
      const { data, error } = value === '000000' ? await supabase.auth.updateUser({ phone: `+1${digits}` }) : { data: null, error: { message: "That code didn't work." } };
      setBusy(false);
      if (error) return fail(error.message);
      db.phone = data?.user?.phone ?? db.phone;
      commit();
      router.dismissTo('/settings');
      return;
    }
    const error = await signInWithCode(digits, value);
    setBusy(false);
    if (error) return fail(error);
    if (db.status === 'ready') {
      router.dismissAll();
      router.replace('/');
    } else {
      router.push('/profile');
    }
  };

  const fail = (message: string) => {
    setProblem(message);
    setCode('');
    input.current?.focus();
  };

  const onChange = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, 6);
    setCode(next);
    if (next.length === 6) submit(next);
  };

  return (
    <AuthStep
      step={2}
      title="enter the code"
      body={`sent to ${phone}`}
      footer={<Button label="next" tone="paper" disabled={code.length !== 6 || busy} onPress={() => submit(code)} />}
    >
      <Pressable onPress={() => input.current?.focus()} style={styles.boxes} accessibilityLabel="6-digit code">
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[styles.box, corners(i), { backgroundColor: code[i] ? colors.paper : colors.straw }, i === code.length && styles.active]}>
            <Hand size={28}>{code[i] ?? ''}</Hand>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={input}
        value={code}
        onChangeText={onChange}
        editable={!busy}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        caretHidden
        accessibilityLabel="6-digit code"
        style={styles.hidden}
      />
      {busy ? <ActivityIndicator color={ink} style={{ marginTop: 20, alignSelf: 'flex-start' }} /> : null}
      {problem ? (
        <Mono size={12} color={colors.paper} style={{ marginTop: 20, marginHorizontal: 4 }} accessibilityLiveRegion="polite">{problem}</Mono>
      ) : null}
      <View style={{ marginTop: 18, marginHorizontal: 4 }}>
        {wait > 0 ? (
          <Mono size={11.5} color={colors.onDarkSoft}>didn’t get it? resend in 0:{String(wait).padStart(2, '0')}</Mono>
        ) : (
          <LinkText label="resend the code" color={colors.paper} onPress={() => setWait(RESEND_AFTER)} />
        )}
      </View>
    </AuthStep>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', justifyContent: 'space-between' },
  box: { width: 48, height: 60, alignItems: 'center', justifyContent: 'center' },
  active: { borderWidth: 2.6, borderColor: colors.olive },
  hidden: { position: 'absolute', opacity: 0, height: 60, width: '100%' },
});
