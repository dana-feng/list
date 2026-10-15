import { useState } from 'react';
import { View } from 'react-native';
import type { InviteAudience, Profile } from '@/api/db';
import { getProfile } from '@/api/profiles';
import { colors } from '@/theme';
import { AudienceOption, AudiencePicker } from './AudiencePicker';
import { AvatarStack } from './Avatar';
import { Button } from './Button';
import { Icon } from './Icon';
import { Paper } from './Paper';
import { Sheet } from './Sheet';
import { choiceIcon } from './VisibilityPicker';
import { MonoMedium } from './Text';

/** An item's open invite: whether it's out, who it goes to, and (for "specific") who was picked. */
export type Invite = { open: boolean; audience: InviteAudience; invitees: string[] };

type Who = 'none' | InviteAudience;

const OPTIONS: AudienceOption<Who>[] = [
  { value: 'none', title: 'no one', icon: 'lock' },
  { value: 'followers', title: 'followers', icon: 'people' },
  { value: 'anyone', title: 'anyone', icon: 'globe' },
  { value: 'specific', title: 'specific people', icon: 'person' },
];

/**
 * "who's invited": no one, followers, anyone or specific people, picked in one place.
 * "no one" is the invite being off. Whatever's picked is kept when the sheet closes, however it closes.
 */
export function InviteSheet({ invite, onDone }: { invite: Invite; onDone: (invite: Invite) => void }) {
  const [who, setWho] = useState<Who>(invite.open ? invite.audience : 'none');
  const [people, setPeople] = useState(invite.invitees);
  const close = () => {
    // "specific people" with nobody ticked is no one
    const none = who === 'none' || (who === 'specific' && !people.length);
    onDone(none ? { ...invite, open: false } : { open: true, audience: who as InviteAudience, invitees: who === 'specific' ? people : [] });
  };
  return (
    <Sheet title="who’s invited" onClose={close} footer={<Button label="done" onPress={close} />}>
      <AudiencePicker options={OPTIONS} value={who} people={people} onChange={(w, p) => { setWho(w); setPeople(p); }} />
    </Sheet>
  );
}

/**
 * The invite on an item's card. Dashed "no one invited" while the invite is off (the default);
 * once it's out, solid, saying who it went to (and how many are down).
 */
export function InviteChip({ invite, down = 0, onPress }: { invite: Invite; down?: number; onPress: () => void }) {
  if (!invite.open) {
    return (
      <Paper onPress={onPress} fill={colors.cream} edge="dash" edgeWidth={1.3} shape={3} round={1.3} style={chip} accessibilityLabel="No one invited. Invite people">
        <Icon name="invite" size={15} strokeWidth={1.8} />
        <MonoMedium size={12}>no one invited</MonoMedium>
      </Paper>
    );
  }
  const picked = invite.invitees.map((id) => getProfile(id)).filter((p): p is Profile => !!p);
  const who = invite.audience === 'specific' ? `${picked.length} invited` : invite.audience === 'anyone' ? 'anyone invited' : 'followers invited';
  const label = down ? `${who} · ${down} down` : who;
  return (
    <Paper onPress={onPress} fill={colors.cream} edge="ink" edgeWidth={1.3} shape={3} round={1.3} style={[chip, picked.length ? { paddingLeft: 5 } : null]} accessibilityLabel={`${label}. Change who's invited`}>
      {invite.audience === 'specific' && picked.length ? <AvatarStack people={picked} size={24} max={3} /> : <View><Icon name={choiceIcon(invite.audience)} size={15} strokeWidth={1.8} /></View>}
      <MonoMedium size={12}>{label}</MonoMedium>
    </Paper>
  );
}

const chip = { alignSelf: 'flex-start' as const, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7, height: 36, paddingHorizontal: 11 };
