import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { followCounts, me, myFollowers } from '@/api/profiles';
import { colors, space } from '@/theme';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { BackButton } from './Header';
import { PersonRow } from './PersonRow';
import { SearchField } from './SearchField';
import { Mono, Serif } from './Text';

type Props = { title: string; initial: string[]; locked?: string[]; submitLabel: (n: number) => string; onSubmit: (ids: string[]) => void };

/** Searchable follower list with checkboxes; used to choose viewers and to invite. */
export function PersonPicker({ title, initial, locked = [], submitLabel, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>(initial);
  const s = q.trim().toLowerCase().replace(/^@/, '');
  const people = myFollowers().filter((p) => !locked.includes(p.id) && (p.name.toLowerCase().includes(s) || p.username.includes(s)));
  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream, paddingTop: insets.top + space.md }}>
      <View style={{ paddingHorizontal: space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, minHeight: 44, marginBottom: space.md }}>
          <BackButton />
          <Serif size={27}>{title}</Serif>
        </View>
        <SearchField value={q} onChange={setQ} placeholder="search your followers" />
        <Mono color={colors.inkSoft} style={{ marginTop: space.lg, marginBottom: space.xs }}>
          {followCounts(me().id).followers} followers · {picked.length} selected
        </Mono>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.lg }} keyboardShouldPersistTaps="handled">
        {people.map((p) => (
          <View key={p.id} style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <PersonRow person={p} onPress={() => toggle(p.id)} right={<Checkbox checked={picked.includes(p.id)} onPress={() => toggle(p.id)} size={22} label={p.name} />} />
          </View>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: insets.bottom + space.lg }}>
        <Button label={submitLabel(picked.length)} onPress={() => onSubmit(picked)} />
      </View>
    </View>
  );
}
