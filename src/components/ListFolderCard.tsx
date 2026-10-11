import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { db, List } from '@/api/db';
import { photosFor } from '@/api/items';
import { invitedBy, listPeople, listProgress, progressLabel, respondInvite, visibilityLabel } from '@/api/lists';
import { colors, folderFills, hash, tilt } from '@/theme';
import { AvatarStack } from './Avatar';
import { Icon } from './Icon';
import { Pill } from './Button';
import { Photo } from './Photo';
import { ProgressBar } from './ProgressBar';
import { Hand, Mono, MonoMedium } from './Text';

/** The first photo anyone added to something on the list, for its cover. */
function coverOf(listId: string) {
  const ids = new Set(db.items.filter((i) => i.list_id === listId).map((i) => i.id));
  const photo = db.item_photos.find((p) => ids.has(p.item_id));
  return photo ? photosFor(photo.item_id)[0] : undefined;
}

const openInviteCount = (listId: string) => db.items.filter((i) => i.list_id === listId && i.open_invite && !i.done_at).length;

/**
 * A list as a folder on a profile: a tab with how far along it is, a cover, the name and a progress bar.
 * `invited` is the olive "invited" folder with join / no. `own` adds who's on it and who can see it.
 */
export function ListFolderCard({ list, invited, own, index }: { list: List; invited?: boolean; own?: boolean; index: number }) {
  const { done, total } = listProgress(list.id);
  const fill = invited ? colors.cream : folderFills[hash(list.id) % folderFills.length];
  const cover = coverOf(list.id);
  const inviter = invitedBy(list.id);
  const invites = own ? 0 : openInviteCount(list.id);
  const pct = total ? Math.round((100 * done) / total) : 0;
  const open = () => router.push(`/list/${list.id}`);

  return (
    <View style={[{ flex: 1 }, invited ? null : tilt(index)]}>
      <View style={[styles.tab, { backgroundColor: invited ? colors.olive : fill, borderColor: invited ? colors.olive : colors.paper }]}>
        <MonoMedium size={11} color={invited ? colors.paper : colors.ink}>{invited ? 'invited' : progressLabel(list.id)}</MonoMedium>
      </View>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`Open ${list.title}`}
        style={[styles.body, { backgroundColor: fill, borderColor: invited ? colors.olive : colors.paper, borderWidth: invited ? 2 : 1.6 }]}
      >
        {cover ? <Photo photo={cover} style={{ height: 66 }} /> : (
          <View style={[styles.cover, { backgroundColor: invited ? colors.sage : fill === colors.paper ? colors.sage : colors.paper }]}>
            <Icon name="image" size={22} />
          </View>
        )}
        <Hand size={17} style={{ lineHeight: 19 }}>{list.title}</Hand>
        {invited ? (
          <>
            <Mono size={10.5}>{inviter ? `${inviter.name} invited you` : 'you were invited'}</Mono>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
              <Pill label="join" height={34} onPress={() => respondInvite(list.id, true)} accessibilityLabel={`Join ${list.title}`} />
              <Pill label="no" on height={34} onPress={() => respondInvite(list.id, false)} accessibilityLabel={`Say no to ${list.title}`} />
            </View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ProgressBar done={done} total={total} />
              {own ? null : <Mono size={10}>{pct}%</Mono>}
            </View>
            {own ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AvatarStack people={listPeople(list.id)} size={22} max={3} />
                <Mono size={10}>{visibilityLabel(list)}</Mono>
              </View>
            ) : invites ? (
              <View style={styles.chip}>
                <Mono size={10} color={colors.paper}>{invites} open invite{invites > 1 ? 's' : ''}</Mono>
              </View>
            ) : null}
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tab: { alignSelf: 'flex-start', height: 32, paddingHorizontal: 12, justifyContent: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 12, borderWidth: 1.6, borderBottomWidth: 0, marginBottom: -1.6, zIndex: 2 },
  body: { padding: 12, paddingBottom: 10, gap: 8, borderTopLeftRadius: 0, borderTopRightRadius: 14, borderBottomRightRadius: 12, borderBottomLeftRadius: 15 },
  cover: { height: 66, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, backgroundColor: colors.bark },
});
