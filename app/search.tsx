import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Item, List, useDb } from '@/api/db';
import { getList, listPeople, progressLabel } from '@/api/lists';
import { useFindPeople } from '@/api/profiles';
import { search, SearchResults } from '@/api/search';
import { AvatarStack } from '@/components/Avatar';
import { FolderTab } from '@/components/FolderTab';
import { Header } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { PeopleList } from '@/components/PeopleList';
import { Paper } from '@/components/Paper';
import { Circle } from '@/components/Scribble';
import { FolderScreen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { Hand, Label, Mono, MonoMedium } from '@/components/Text';
import { names } from '@/lib';
import { cardFills, colors } from '@/theme';

type Kind = keyof SearchResults;

/** Each kind shows this many until you tap "show all". */
const PREVIEW = 5;

/** People by name or @username, and lists and items by what they're called (items by their notes too), all on one page. */
export default function Search() {
  useDb();
  const [q, setQ] = useState('');
  // kinds opened up with "show all"; back to the preview whenever the search changes
  const [open, setOpen] = useState<Kind[]>([]);
  const term = q.trim();
  // people you aren't connected to come from the server; they show up here as they arrive
  useFindPeople(q);
  const found = search(q);
  const count = found.people.length + found.lists.length + found.items.length;
  const shown = <K extends Kind>(kind: K): SearchResults[K] => (open.includes(kind) ? found[kind] : (found[kind].slice(0, PREVIEW) as SearchResults[K]));
  const type = (next: string) => {
    setQ(next);
    setOpen([]);
  };

  const section = (kind: Kind, body: React.ReactNode) =>
    found[kind].length ? (
      <View style={{ gap: 8 }}>
        <Label style={{ marginHorizontal: 2 }}>{kind}</Label>
        {body}
        {found[kind].length > PREVIEW && !open.includes(kind) ? (
          <Pressable onPress={() => setOpen([...open, kind])} hitSlop={8} style={{ alignSelf: 'flex-start', marginHorizontal: 2, minHeight: 32, justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={`Show all ${found[kind].length} ${kind}`}>
            <MonoMedium size={11}>show all {found[kind].length} {kind} ↓</MonoMedium>
          </Pressable>
        ) : null}
      </View>
    ) : null;

  return (
    <FolderScreen header={<Header />} folderTabs={<FolderTab label="search" />}>
      <View style={{ marginBottom: 14 }}>
        <SearchField value={q} onChange={type} placeholder="search people, lists, items" autoFocus />
      </View>
      {!term ? (
        <Mono size={12} center color={colors.inkSoft} style={{ marginTop: 24, lineHeight: 18 }}>find people by name or @username, and lists and items by what they’re called.</Mono>
      ) : null}
      <View style={{ gap: 22 }}>
        {section('people', <PeopleList people={shown('people')} notes />)}
        {section('lists', shown('lists').map((l, i) => <ListResult key={l.id} list={l} index={i} />))}
        {section('items', shown('items').map((it, i) => <ItemResult key={it.id} item={it} index={i} />))}
      </View>
      {term && !count ? (
        <View style={{ marginTop: 24, alignItems: 'center', gap: 6 }}>
          <Hand size={20}>{`nothing called “${term}”`}</Hand>
          <Mono size={12} center color={colors.inkSoft} style={{ maxWidth: 270, lineHeight: 18 }}>try part of a name, or check the spelling. lists and items only show if you can open them.</Mono>
        </View>
      ) : null}
    </FolderScreen>
  );
}

/** A list: its name, who's on it, how far along. */
function ListResult({ list, index }: { list: List; index: number }) {
  const people = listPeople(list.id);
  return (
    <Paper
      onPress={() => router.push(`/list/${list.id}`)}
      fill={cardFills[index % cardFills.length]}
      shape={index}
      lean={index}
      style={styles.row}
      accessibilityLabel={`${list.title}, a list by ${names(people)}`}
    >
      <Icon name="folder" size={20} />
      <View style={{ flex: 1, gap: 2 }}>
        <Hand size={17} numberOfLines={1}>{list.title}</Hand>
        <Mono size={10.5} color={colors.inkSoft} numberOfLines={1}>{names(people)} · {progressLabel(list.id) || 'all done'}</Mono>
      </View>
      <AvatarStack people={people} size={22} max={3} />
    </Paper>
  );
}

/** An item: crossed off or not, its name, and the list it's on. */
function ItemResult({ item, index }: { item: Item; index: number }) {
  const list = getList(item.list_id);
  return (
    <Paper
      onPress={() => router.push(`/item/${item.id}`)}
      fill={colors.cream}
      edge="ink"
      edgeWidth={1.2}
      shape={index + 1}
      lean={index + 2}
      style={styles.row}
      accessibilityLabel={`${item.title}${item.done_at ? ', done' : ''}, on ${list?.title ?? 'a list'}`}
    >
      <Circle size={22} filled={!!item.done_at} />
      <View style={{ flex: 1, gap: 2 }}>
        <Hand size={17} numberOfLines={1} color={item.done_at ? colors.inkSoft : colors.ink}>{item.title}</Hand>
        {list ? <Mono size={10.5} color={colors.inkSoft} numberOfLines={1}>on {list.title}</Mono> : null}
      </View>
      <Icon name="right" size={16} />
    </Paper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, paddingHorizontal: 12 },
});
