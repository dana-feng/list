import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { emailOk, FEEDBACK_KINDS, FEEDBACK_MAX, FeedbackKind, sendFeedback } from '@/api/feedback';
import { colors, fonts, noOutline } from '@/theme';
import { Button, Pill } from './Button';
import { Paper } from './Paper';
import { Sheet } from './Sheet';
import { Label, Mono } from './Text';

/** Feedback from settings: what kind and what happened, an optional email for a reply, then a thank-you. */
export function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const canSend = !!message.trim() && emailOk(email) && !sending;

  const send = async () => {
    setSending(true);
    const ok = await sendFeedback(kind, message, email);
    setSending(false);
    // when it fails, write() has already said why; the message stays so they can try again
    if (ok) setSent(true);
  };

  if (sent) {
    return (
      <Sheet title="thank you" onClose={onClose} footer={<Button label="done" onPress={onClose} />}>
        <Mono size={12.5} style={{ lineHeight: 19 }}>
          {email.trim() ? `we read every note, and we’ll write back to ${email.trim()}` : 'we read every note'}
        </Mono>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="send feedback"
      onClose={onClose}
      footer={<Button label={sending ? 'sending…' : 'send'} onPress={send} disabled={!canSend} />}
    >
      <Label style={styles.label}>problem</Label>
      <View style={styles.kinds} accessibilityRole="radiogroup">
        {FEEDBACK_KINDS.map((k) => (
          <Pill key={k.key} label={k.label} filled={kind === k.key} on={kind === k.key} onPress={() => setKind(k.key)} />
        ))}
      </View>

      <Paper fill={colors.cream} edge="dash" edgeWidth={1.3} shape={0} round={1.3} style={styles.box}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          maxLength={FEEDBACK_MAX}
          multiline
          autoFocus
          placeholder={kind === 'bug' ? 'what you expected, what you saw' : 'anything helps'}
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Feedback"
          style={[styles.input, noOutline]}
        />
      </Paper>

      <Label style={[styles.label, { marginTop: 16 }]}>email (optional)</Label>
      <Paper fill={colors.cream} edge="dash" edgeWidth={1.3} shape={0} round={1.3} style={styles.field}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="your email"
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Email, optional"
          style={[styles.line, noOutline]}
        />
      </Paper>
      <Mono size={10.5} color={colors.inkSoft} style={{ marginTop: 6, marginHorizontal: 2 }} accessibilityLiveRegion="polite">
        {emailOk(email) ? 'we’ll see your username and app version, plus your email if you add it' : 'that email doesn’t look right'}
      </Mono>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8, marginTop: 4, marginHorizontal: 2 },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  box: { minHeight: 132, paddingHorizontal: 14, paddingVertical: 10 },
  field: { height: 48, paddingHorizontal: 14, justifyContent: 'center' },
  line: { fontFamily: fonts.mono, fontSize: 14, color: colors.ink, height: 44 },
  input: { flex: 1, minHeight: 112, fontFamily: fonts.mono, fontSize: 14, lineHeight: 20, color: colors.ink, textAlignVertical: 'top' },
});
