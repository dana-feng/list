import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { db, Profile, Visibility } from '@/api/db';
import { canLeaveList, cancelInvite, getList, inviteMembers, renameList, setViewers, setVisibility, viewerIds } from '@/api/lists';
import { getProfile, me } from '@/api/profiles';
import { LIST_TITLE_MAX } from '@/limits';
import { colors, fonts, noOutline } from '@/theme';
import { AudienceOption, AudiencePicker } from './AudiencePicker';
import { Avatar } from './Avatar';
import { Button, LinkText } from './Button';
import { ConfirmCard } from './ConfirmDialog';
import { Icon } from './Icon';
import { Paper } from './Paper';
import { PersonPicker } from './PersonPicker';
import { Sheet } from './Sheet';
import { Label, Mono } from './Text';

const OPTIONS: AudienceOption<Visibility>[] = [
  { value: 'just_me', title: 'owners', icon: 'lock' },
  { value: 'followers', title: 'followers', icon: 'people' },
  { value: 'anyone', title: 'anyone', icon: 'globe' },
  { value: 'specific', title: 'specific people', icon: 'person' },
];

/** Someone on the list. `onRemove` puts a small × badge on the corner to take them off: you leaving, or an invite taken back. */
function PersonChip({ person, note, onRemove, removeLabel }: { person: Profile; note?: string; onRemove?: () => void; removeLabel?: string }) {
  return (
    <Paper fill={colors.sage} shape={2} round={2} style={{ height: 36, paddingLeft: 4, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Avatar person={person} size={26} />
      <Mono size={12.5}>{note ? `${person.name} · ${note}` : person.name}</Mono>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={12} style={styles.remove} accessibilityRole="button" accessibilityLabel={removeLabel}>
          <Icon name="x" size={7} color={colors.paper} strokeWidth={3.2} />
        </Pressable>
      ) : null}
    </Paper>
  );
}

/**
 * A list's settings, opened from the ⋯ menu: its name, its owners, and who can see it.
 * Adding owners sends their invites straight away; the rest is kept when the sheet closes, however it closes.
 */
export function ListSettingsSheet({ listId, onClose, onDelete, onLeave }: { listId: string; onClose: () => void; onDelete: () => void; onLeave: () => void }) {
  const list = getList(listId)!;
  const [title, setTitle] = useState(list.title);
  const [choice, setChoice] = useState<Visibility>(list.visibility);
  const [viewers, setViewerDraft] = useState(() => viewerIds(listId));
  const [addingOwners, setAddingOwners] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // your × was tapped: leaving waits on "leave list"
  const [leaving, setLeaving] = useState(false);
  // an invite whose × was tapped, waiting on "take back invite"
  const [unInviting, setUnInviting] = useState<Profile | null>(null);
  // everyone else on the list, joined or still invited
  const others = db.list_members.filter((m) => m.list_id === listId && m.user_id !== db.me);
  // just you on it: "owners" would mean you
  const options = others.length ? OPTIONS : OPTIONS.map((o) => (o.value === 'just_me' ? { ...o, title: 'you' } : o));

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
          <LinkText label="delete list" color={colors.burntOrange} onPress={() => setConfirmingDelete(true)} />
          <Button label="done" onPress={close} style={{ minWidth: 130 }} />
        </View>
      }
      overlay={
        confirmingDelete ? (
          <ConfirmCard
            title={`delete “${list.title}”?`}
            body="everything on it goes too, for everyone on it. this can’t be undone."
            action="delete list"
            onConfirm={onDelete}
            onCancel={() => setConfirmingDelete(false)}
          />
        ) : leaving ? (
          <ConfirmCard
            title="leave this list?"
            body="it stays with the other owners. to come back, one of them has to invite you again."
            action="leave list"
            onConfirm={onLeave}
            onCancel={() => setLeaving(false)}
          />
        ) : unInviting ? (
          <ConfirmCard
            title={`take back ${unInviting.name}’s invite?`}
            body="they won’t be able to join this list unless someone invites them again."
            action="take back invite"
            onConfirm={() => { cancelInvite(listId, unInviting.id); setUnInviting(null); }}
            onCancel={() => setUnInviting(null)}
          />
        ) : null
      }
    >
      <View style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Label>name</Label>
          <Paper fill={colors.cream} edge="ink" shape={1}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              maxLength={LIST_TITLE_MAX}
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
            {/* only once someone else has joined: the last owner leaving would take the list with them */}
            <PersonChip
              person={{ ...me(), name: 'you' }}
              onRemove={canLeaveList(listId) ? () => setLeaving(true) : undefined}
              removeLabel="Leave this list"
            />
            {others.map((m) => {
              const p = getProfile(m.user_id);
              if (!p) return null;
              const invited = m.status === 'invited';
              return (
                <PersonChip
                  key={m.user_id}
                  person={p}
                  note={invited ? 'invited' : undefined}
                  onRemove={invited ? () => setUnInviting(p) : undefined}
                  removeLabel={`Take back ${p.name}'s invite`}
                />
              );
            })}
            <Paper onPress={() => setAddingOwners(true)} edge="dash" shape={3} round={2} style={{ height: 36, paddingHorizontal: 14, justifyContent: 'center' }} accessibilityLabel="Add owners">
              <Mono size={12.5}>+ add</Mono>
            </Paper>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Label>who can see it</Label>
          <AudiencePicker options={options} value={choice} people={viewers} onChange={(c, v) => { setChoice(c); setViewerDraft(v); }} />
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

const styles = StyleSheet.create({
  // small and dark, sitting over the chip's top right corner
  remove: {
    position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bark, borderWidth: 1.5, borderColor: colors.paper,
  },
});
