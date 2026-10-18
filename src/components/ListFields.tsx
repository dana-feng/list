import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import type { Profile } from '@/api/db';
import { getProfile, me } from '@/api/profiles';
import { colors, fonts, noOutline } from '@/theme';
import { Avatar } from './Avatar';
import { Paper } from './Paper';
import { PersonPicker } from './PersonPicker';
import { Hand, Label, Mono } from './Text';
import { Choice, choiceIcon, choiceLabel, VisibilityButton, VisibilityMenu, visibilityOptions } from './VisibilityPicker';

/** "label ...stuff" on one line, the label in a fixed column. */
export function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 }}>
      <Label size={10.5} style={{ width: 92 }}>{label}</Label>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{children}</View>
    </View>
  );
}

function PersonChip({ person, you }: { person: Profile; you?: boolean }) {
  return (
    <Paper fill={colors.sage} shape={2} round={1.6} style={{ height: 30, paddingLeft: 3, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Avatar person={person} size={22} fill={you ? colors.cream : undefined} />
      <Mono size={11.5}>{you ? 'you' : person.name}</Mono>
    </Paper>
  );
}

/** The big title field with a dashed underline. */
export function TitleInput({ value, onChange, placeholder, size = 30, autoFocus, onBlur }: { value: string; onChange: (v: string) => void; placeholder: string; size?: number; autoFocus?: boolean; onBlur?: () => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      placeholderTextColor={colors.inkFaint}
      autoFocus={autoFocus}
      multiline
      blurOnSubmit
      returnKeyType="done"
      accessibilityLabel={placeholder}
      style={[{
        fontFamily: fonts.hand, fontSize: size, lineHeight: size * 1.1, color: colors.ink, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 4,
        borderBottomWidth: 1.6, borderStyle: 'dashed', borderColor: colors.ink,
      }, noOutline]}
    />
  );
}

/**
 * A title you can tap to rename, with no edit mode: it turns into a field, and saves when you tap away.
 * Leave out `onSave` (not yours) and it's plain text.
 */
export function EditableTitle({ value, onSave, size, color, placeholder }: { value: string; onSave?: (v: string) => void; size: number; color?: string; placeholder: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft !== null) {
    const commit = () => {
      const next = draft.trim();
      setDraft(null);
      if (next && next !== value) onSave?.(next);
    };
    return <TitleInput value={draft} onChange={setDraft} onBlur={commit} placeholder={placeholder} size={size} autoFocus />;
  }
  const text = <Hand size={size} color={color} style={{ lineHeight: Math.round(size * 1.1) }}>{value}</Hand>;
  if (!onSave) return text;
  return (
    <Pressable onPress={() => setDraft(value)} accessibilityRole="button" accessibilityLabel={`${value}. Rename`} style={{ alignSelf: 'stretch' }}>
      {text}
    </Pressable>
  );
}

type Props = {
  title: string;
  onTitle: (v: string) => void;
  /** Everyone else on the list or invited to it. */
  owners: string[];
  /** People already on the list, who can't be taken off here. */
  lockedOwners?: string[];
  onOwners: (ids: string[]) => void;
  choice: Choice;
  viewers: string[];
  onVisibility: (choice: Choice, viewers: string[]) => void;
  autoFocus?: boolean;
};

/** Name, owners and who can see it: shared by "new list" and editing a list. */
export function ListFields({ title, onTitle, owners, lockedOwners = [], onOwners, choice, viewers, onVisibility, autoFocus }: Props) {
  const [menu, setMenu] = useState(false);
  const [picking, setPicking] = useState<'owners' | 'viewers' | null>(null);
  const people = [...lockedOwners, ...owners].map((id) => getProfile(id)).filter((p): p is Profile => !!p);
  const solo = !people.length;
  const pick = (c: Choice) => {
    setMenu(false);
    if (c === 'specific') setPicking('viewers');
    else onVisibility(c, []);
  };
  return (
    <View>
      <TitleInput value={title} onChange={onTitle} placeholder="untitled list" autoFocus={autoFocus} />
      <View style={{ gap: 6, marginTop: 14 }}>
        <FieldRow label="owners">
          <PersonChip person={me()} you />
          {people.map((p) => <PersonChip key={p.id} person={p} />)}
          <Paper onPress={() => setPicking('owners')} edge="dash" edgeWidth={1.3} shape={3} round={1.5} style={{ height: 30, paddingHorizontal: 10, justifyContent: 'center' }} accessibilityLabel="Add owners">
            <Mono size={11}>+ add</Mono>
          </Paper>
        </FieldRow>
        <FieldRow label="who can see">
          <VisibilityButton label={choiceLabel(choice, viewers.length, solo)} icon={choiceIcon(choice)} open={menu} onPress={() => setMenu(!menu)} />
        </FieldRow>
      </View>
      {menu ? (
        <View style={{ marginLeft: 102 }}>
          <VisibilityMenu value={choice} onPick={pick} options={visibilityOptions(solo)} />
        </View>
      ) : null}
      {picking === 'owners' ? <PersonPicker
        title="owners"
        initial={owners}
        locked={lockedOwners}
        onClose={() => setPicking(null)}
        onDone={(ids) => { onOwners(ids); setPicking(null); }}
      /> : null}
      {picking === 'viewers' ? <PersonPicker
        title="who can see it"
        initial={viewers}
        onClose={() => setPicking(null)}
        onDone={(ids) => { onVisibility(ids.length ? 'specific' : 'just_me', ids); setPicking(null); }}
      /> : null}
    </View>
  );
}
