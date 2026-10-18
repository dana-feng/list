import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Item, List, useDb } from '@/api/db';
import { getList, listPeople, progressLabel } from '@/api/lists';
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
type Tab = 'all' | Kind;

/** On "all", each kind shows this many before "see all". */
const PREVIEW = 3;

/** People by name or @username, and lists and items by what they're called (items by their notes too). */
export default function Search() {
  useDb();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const term = q.trim();
  const found = search(q);
  const count = found.people.length + found.lists.length + found.items.length;
  const shown = <K extends Kind>(kind: K): SearchResults[K] => (tab === 'all' ? (found[kind].slice(0, PREVIEW) as SearchResults[K]) : found[kind]);
  const more = (kind: Kind) => tab === 'all' && found[kind].length > PREVIEW;
  const nothing = term && !(tab === 'all' ? count : found[tab].length);

  const section = (kind: Kind, body: React.ReactNode) =>
    shown(kind).length ? (
      <View style={{ gap: 8 }}>
        {tab === 'all' ? (
          <View style={styles.heading}>
            <Label>{kind}</Label>
            {more(kind) ? (
              <Pressable onPress={() => setTab(kind)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`See all ${found[kind].length} ${kind}`}>
                <MonoMedium size={11}>see all {found[kind].length} →</MonoMedium>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {body}
      </View>
    ) : null;

  return (
    <FolderScreen
      header={<Header />}
      roundCorner={tab !== 'all'}
      folderTabs={
        <>
          {(['all', 'people', 'lists', 'items'] as const).map((kind) => (
            <FolderTab key={kind} tab label={kind} on={tab === kind} onPress={() => setTab(kind)} />
          ))}
        </>
      }
    >
      <View style={{ marginBottom: 14 }}>
        <SearchField value={q} onChange={setQ} placeholder="search people, lists, items" autoFocus />
      </View>
      {!term ? (
        <Mono size={12} center color={colors.inkSoft} style={{ marginTop: 24, lineHeight: 18 }}>find people by name or @username, and lists and items by what they’re called.</Mono>
      ) : null}
      <View style={{ gap: 22 }}>
        {section('people', <PeopleList people={shown('people')} notes />)}
        {section('lists', shown('lists').map((l, i) => <ListResult key={l.id} list={l} index={i} />))}
        {section('items', shown('items').map((it, i) => <ItemResult key={it.id} item={it} index={i} />))}
      </View>
      {nothing ? <Mono size={12} center color={colors.inkSoft} style={{ marginTop: 24 }}>no results</Mono> : null}
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
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, paddingHorizontal: 12 },
});
