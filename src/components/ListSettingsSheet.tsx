import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { db, Profile, Visibility } from '@/api/db';
import { getList, inviteMembers, renameList, setViewers, setVisibility, viewerIds } from '@/api/lists';
import { getProfile, me } from '@/api/profiles';
import { colors, fonts, noOutline } from '@/theme';
import { AudienceOption, AudiencePicker } from './AudiencePicker';
import { Avatar } from './Avatar';
import { Button, LinkText } from './Button';
import { Paper } from './Paper';
import { PersonPicker } from './PersonPicker';
import { Sheet } from './Sheet';
import { Label, Mono } from './Text';

const OPTIONS: AudienceOption<Visibility>[] = [
  { value: 'just_me', title: 'owners' },
  { value: 'followers', title: 'followers' },
  { value: 'anyone', title: 'anyone' },
  { value: 'specific', title: 'specific people' },
];

function PersonChip({ person, note }: { person: Profile; note?: string }) {
  return (
    <Paper fill={colors.sage} shape={2} round={2} style={{ height: 36, paddingLeft: 4, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Avatar person={person} size={26} />
      <Mono size={12.5}>{note ? `${person.name} · ${note}` : person.name}</Mono>
    </Paper>
  );
}

/**
 * A list's settings, opened from the ⋯ menu: its name, its owners, and who can see it.
 * Adding owners sends their invites straight away; the rest is kept when the sheet closes, however it closes.
 */
export function ListSettingsSheet({ listId, onClose, onDelete }: { listId: string; onClose: () => void; onDelete: () => void }) {
  const list = getList(listId)!;
  const [title, setTitle] = useState(list.title);
  const [choice, setChoice] = useState<Visibility>(list.visibility);
  const [viewers, setViewerDraft] = useState(() => viewerIds(listId));
  const [addingOwners, setAddingOwners] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // everyone else on the list, joined or still invited
  const others = db.list_members.filter((m) => m.list_id === listId && m.user_id !== db.me);

  const close = () => {
    renameList(listId, title);
    // "specific people" with nobody picked is just the owners
    const next: Visibility = choice === 'specific' && !viewers.length ? 'just_me' : choice;
    if (next === 'specific') {
      const was = viewerIds(listId);
      if (viewers.length !== was.length || viewers.some((v) => !was.includes(v))) setViewers(listId, viewers);
    }
    if (next !== list.visibility) setVisibility(listId, next);
    onClose();
  };

  return (
    <Sheet
      title="list settings"
      onClose={close}
      footer={
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {confirmingDelete ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Mono size={12} color={colors.inkSoft}>delete it?</Mono>
              <LinkText label="yes" color={colors.bark} onPress={onDelete} />
              <LinkText label="no" onPress={() => setConfirmingDelete(false)} />
            </View>
          ) : (
            <LinkText label="delete list" color={colors.bark} onPress={() => setConfirmingDelete(true)} />
          )}
          <Button label="done" onPress={close} style={{ minWidth: 130 }} />
        </View>
      }
    >
      <View style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Label>name</Label>
          <Paper fill={colors.cream} edge="ink" shape={1}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="untitled list"
              placeholderTextColor={colors.inkFaint}
              accessibilityLabel="List name"
              returnKeyType="done"
              style={[{ height: 48, paddingHorizontal: 14, fontFamily: fonts.hand, fontSize: 18, color: colors.ink }, noOutline]}
            />
          </Paper>
        </View>

        <View style={{ gap: 8 }}>
          <Label>owners</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <PersonChip person={{ ...me(), name: 'you' }} />
            {others.map((m) => {
              const p = getProfile(m.user_id);
              return p ? <PersonChip key={m.user_id} person={p} note={m.status === 'invited' ? 'invited' : undefined} /> : null;
            })}
            <Paper onPress={() => setAddingOwners(true)} edge="dash" shape={3} round={2} style={{ height: 36, paddingHorizontal: 14, justifyContent: 'center' }} accessibilityLabel="Add owners">
              <Mono size={12.5}>+ add</Mono>
            </Paper>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Label>who can see it</Label>
          <AudiencePicker options={OPTIONS} value={choice} people={viewers} onChange={(c, v) => { setChoice(c); setViewerDraft(v); }} />
        </View>
      </View>

      {addingOwners ? (
        <PersonPicker
          title="add owners"
          initial={[]}
          locked={others.map((m) => m.user_id)}
          onClose={() => setAddingOwners(false)}
          onDone={(ids) => { if (ids.length) inviteMembers(listId, ids); setAddingOwners(false); }}
        />
      ) : null}
    </Sheet>
  );
}
