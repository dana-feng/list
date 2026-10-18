import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { db } from '@/api/db';
import { companionIds, companionsFor, getItem, interestedPeople, MAX_COMPANIONS, setCompanions, untagMe } from '@/api/items';
import { canViewList, isMember, listPeople } from '@/api/lists';
import { names } from '@/lib';
import { colors } from '@/theme';
import { AvatarStack } from './Avatar';
import { LinkText } from './Button';
import { goBack } from './Header';
import { PeoplePress } from './PeopleSheet';
import { PersonPicker } from './PersonPicker';
import { Mono } from './Text';

/**
 * Who something crossed off was done with: "with jo + tochi". On your list, tap it to tag anyone
 * (people who were interested come first). Tagged on someone else's, you can untag yourself.
 * Nothing for anyone else when nobody's tagged, or while the item is still open.
 * `onDark` for the done screen's dark background.
 */
export function DidItWith({ itemId, onDark = false }: { itemId: string; onDark?: boolean }) {
  const [picking, setPicking] = useState(false);
  const item = getItem(itemId);
  if (!item || !item.done_at) return null;
  const member = isMember(item.list_id);
  const people = companionsFor(itemId);
  const color = onDark ? colors.paper : colors.ink;
  const soft = onDark ? colors.onDarkSoft : colors.inkSoft;

  if (!member) {
    if (!people.length) return null;
    const tagged = people.some((p) => p.id === db.me);
    const untag = () => {
      const stays = canViewList(item.list_id);
      untagMe(itemId);
      // the tag was all that let you see it
      if (!stays) goBack();
    };
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <PeoplePress people={people} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          <AvatarStack people={people} size={22} max={3} />
          <Mono size={11.5} color={color} numberOfLines={2} style={{ flexShrink: 1 }}>with {names(people)}</Mono>
        </PeoplePress>
        {tagged ? <View style={{ marginLeft: 'auto' }}><LinkText label="untag me" size={11} color={soft} onPress={untag} /></View> : null}
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setPicking(true)}
        hitSlop={6}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 }}
        accessibilityRole="button"
        accessibilityLabel={people.length ? `Did it with ${names(people)}. Tap to change` : 'Tag who you did it with'}
      >
        {people.length ? (
          <>
            <AvatarStack people={people} size={24} max={3} />
            <Mono size={11.5} color={color} numberOfLines={2} style={{ flexShrink: 1 }}>with {names(people)}</Mono>
            <Mono size={11} color={soft} style={{ marginLeft: 'auto', textDecorationLine: 'underline' }}>edit</Mono>
          </>
        ) : (
          <Mono size={12} color={color} style={{ textDecorationLine: 'underline' }}>+ who’d you do it with?</Mono>
        )}
      </Pressable>
      {picking ? (
        <PersonPicker
          title="did it with"
          pool="anyone"
          initial={companionIds(itemId)}
          locked={listPeople(item.list_id).map((p) => p.id)}
          suggested={interestedPeople(itemId).map((p) => p.id)}
          max={MAX_COMPANIONS}
          onDone={(ids) => {
            setCompanions(itemId, ids);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </>
  );
}
