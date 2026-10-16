import { useState } from 'react';
import type { InviteAudience } from '@/api/db';
import { View } from 'react-native';
import { colors } from '@/theme';
import { AudienceOption, AudiencePicker } from './AudiencePicker';
import { Button, LinkText } from './Button';
import { Sheet } from './Sheet';
import { Mono } from './Text';

const OPTIONS: AudienceOption<InviteAudience>[] = [
  { value: 'followers', title: 'followers', icon: 'people' },
  { value: 'anyone', title: 'anyone', icon: 'globe' },
  { value: 'specific', title: 'specific people', icon: 'person' },
];

/**
 * Who an invite goes to: followers, anyone, or specific people. No title (the chip that opened it
 * says what it's for). Whatever's picked is kept when the sheet closes, however it closes;
 * "clear" takes the invite tag off. "specific people" with nobody ticked is the same as clearing.
 */
export function InviteSheet({ audience, invitees, onDone, onClear }: {
  audience: InviteAudience;
  invitees: string[];
  onDone: (audience: InviteAudience, invitees: string[]) => void;
  onClear: () => void;
}) {
  const [who, setWho] = useState<InviteAudience>(audience);
  const [people, setPeople] = useState(invitees);
  const close = () => {
    if (who === 'specific' && !people.length) onClear();
    else onDone(who, who === 'specific' ? people : []);
  };
  return (
    <Sheet onClose={close} footer={<SheetFooter onDone={close} onClear={onClear} />}>
      <AudiencePicker options={OPTIONS} value={who} people={people} onChange={(w, p) => { setWho(w); setPeople(p); }} />
    </Sheet>
  );
}

/** "done", and "clear" under it to take the tag off, the way the calendar has clear. */
export function SheetFooter({ onDone, onClear, clearNote }: { onDone: () => void; onClear?: () => void; clearNote?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Button label="done" onPress={onDone} />
      {onClear ? (
        <View style={{ alignSelf: 'center' }}><LinkText label="clear" size={11.5} onPress={onClear} /></View>
      ) : clearNote ? (
        <Mono size={11} center color={colors.inkSoft} style={{ marginTop: 8, lineHeight: 17 }}>{clearNote}</Mono>
      ) : null}
    </View>
  );
}
