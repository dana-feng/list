import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { Item, List, Profile } from '@/api/db';
import { useDb } from '@/api/db';
import { canClaimGift, canSayHave, claimGift, giftOf, iHaveIt, photosFor, toggleHave } from '@/api/items';
import { inviteHosts } from '@/api/feed';
import { listPeople } from '@/api/lists';
import { toggle } from '@/haptics';
import { dayParts } from '@/lib';
import { colors, corners, tilt } from '@/theme';
import { AvatarStack } from './Avatar';
import { Pill } from './Button';
import { DownButton } from './Down';
import { Icon } from './Icon';
import { PeoplePress } from './PeopleSheet';
import { Photo } from './Photo';
import { TAG_ICON } from './TagField';
import { Hand, Mono, MonoMedium } from './Text';
import { Surface } from './Surface';

const STUBS = [colors.sage, colors.sun, colors.paper, colors.almostWhite];

/** "jo", "jo + sam", "jo + 4": names stop at two so the list's name still fits. */
function ownersText(people: Profile[]) {
  if (people.length <= 2) return people.map((p) => p.name).join(' + ');
  return `${people[0].name} + ${people.length - 1}`;
}

/**
 * An ask as a ticket: the due date stub on the left, then whose it is (faces, names, the list), the
 * item, the tag, and one button: "i'm interested", "i'll get it" or "i have it". No button on your own.
 */
export function AskRow({ item, list, index }: { item: Item; list: List; index: number }) {
  useDb();
  const owners = item.tag === 'invite' ? inviteHosts(item) : listPeople(list.id);
  const date = item.date ? dayParts(item.date) : null;
  const photo = photosFor(item.id)[0];
  const tag = item.tag!;
  return (
    <Surface tone="light">
    <View style={[styles.ticket, tilt(index, 0.8)]}>
      <View style={[styles.stub, { backgroundColor: STUBS[index % STUBS.length] }]} accessibilityLabel={date ? `Due ${date.weekday.toLowerCase()} ${date.day}` : 'No due date'}>
        <Mono size={9.5} color={colors.inkSoft} style={{ letterSpacing: 1 }}>due</Mono>
        {date ? <Mono size={10} style={{ letterSpacing: 1 }}>{date.weekday.toLowerCase()}</Mono> : null}
        <Hand size={28} style={{ lineHeight: 30 }}>{date ? date.day : '?'}</Hand>
      </View>
      <View style={[corners(index), styles.body]}>
        {photo ? <Photo photo={photo} style={{ height: 132 }} /> : null}
        <View style={styles.who}>
          <PeoplePress people={owners} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AvatarStack people={owners} size={22} max={3} />
            {owners.length > 3 ? (
              <View style={styles.more}><Surface tone="dark"><MonoMedium size={9.5} color={colors.paper}>+{owners.length - 3}</MonoMedium></Surface></View>
            ) : null}
          </PeoplePress>
          <Mono size={10.5} color={colors.inkSoft} numberOfLines={1} style={{ flexShrink: 1 }}>{ownersText(listPeople(list.id))} · {list.title}</Mono>
        </View>
        <Pressable onPress={() => router.push(`/item/${item.id}`)} accessibilityRole="button">
          <Hand size={18}>{item.title}</Hand>
        </Pressable>
        <View style={styles.bottom}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }}>
            <Icon name={TAG_ICON[tag]} size={13} strokeWidth={1.8} />
            <Mono size={11}>{tag}</Mono>
          </View>
          <AskButton item={item} />
        </View>
      </View>
    </View>
    </Surface>
  );
}

/** The one thing to do about an ask from the ticket. Like "i'm interested": "i…" in outline until you tap it, then "you…" filled in. */
function AskButton({ item }: { item: Item }) {
  if (item.tag === 'invite') return <DownButton itemId={item.id} />;
  if (item.tag === 'gift') {
    if (!canClaimGift(item.id)) return null;
    const mine = giftOf(item.id).mine;
    return (
      <Pill
        label={mine ? "you're getting it" : "i'll get it"}
        on={!!mine}
        filled={!!mine}
        onPress={() => {
          toggle(!mine);
          claimGift(item.id, mine ? 0 : 1);
        }}
        accessibilityLabel={mine ? `You're getting ${item.title}. Tap to take it back` : `I'll get ${item.title}`}
      />
    );
  }
  if (!canSayHave(item.id)) return null;
  const have = iHaveIt(item.id);
  return (
    <Pill
      label={have ? 'you have it' : 'i have it'}
      on={have}
      filled={have}
      onPress={() => {
        toggle(!have);
        toggleHave(item.id);
      }}
      accessibilityLabel={have ? `You said you have ${item.title}. Tap to take it back` : `I have ${item.title}`}
    />
  );
}

const styles = StyleSheet.create({
  ticket: { flexDirection: 'row', minHeight: 104 },
  stub: {
    width: 66, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1.5, borderColor: colors.ink,
    borderTopLeftRadius: 10, borderBottomLeftRadius: 11, borderTopRightRadius: 4, borderBottomRightRadius: 4,
  },
  body: {
    flex: 1, marginLeft: -1.5, backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.ink, padding: 12, paddingLeft: 14, gap: 8,
    borderTopLeftRadius: 4, borderBottomLeftRadius: 4,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: -5 },
  more: { height: 22, marginLeft: -6, paddingHorizontal: 5, borderRadius: 7, backgroundColor: colors.bark, borderWidth: 1.5, borderColor: colors.ink, justifyContent: 'center' },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 32 },
});
