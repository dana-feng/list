import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useDb } from '@/api/db';
import { asksOf } from '@/api/feed';
import { listsForProfile } from '@/api/lists';
import { getProfileByUsername, isFollowing, toggleFollow } from '@/api/profiles';
import { block, blockedByUsername, unblock } from '@/api/safety';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { FolderGrid } from '@/components/FolderGrid';
import { Header } from '@/components/Header';
import { MoreMenu } from '@/components/MoreMenu';
import { ProfileHeader } from '@/components/ProfileHeader';
import { AskList } from '@/components/AskList';
import { ActivityList, PROFILE_TABS, ProfileTab, ProfileTabs } from '@/components/ProfileTabs';
import { ReportSheet } from '@/components/ReportSheet';
import { Screen } from '@/components/Screen';
import { SwipeTabs, useTabPosition } from '@/components/SwipeTabs';
import { Hand, Mono, MonoMedium } from '@/components/Text';
import { colors } from '@/theme';

/** Someone else's profile: their lists, and a tab with what they've posted. Report or block them under ⋯. */
export default function User() {
  const db = useDb();
  const { username } = useLocalSearchParams<{ username: string }>();
  const person = getProfileByUsername(username);
  const [tab, setTab] = useState<ProfileTab>('lists');
  const [reporting, setReporting] = useState(false);
  const tracking = useTabPosition(0);
  const blocked = blockedByUsername(username);
  if (blocked) {
    // what's left of someone you've blocked: who they are, and the way back
    return (
      <Screen header={<Header center={<MonoMedium size={14} color={colors.paper}>@{blocked.username}</MonoMedium>} />}>
        <View style={{ alignItems: 'center', gap: 10, paddingTop: 36 }}>
          <Avatar person={blocked} size={92} edge={colors.paper} />
          <Hand size={24} color={colors.paper}>you blocked {blocked.name}</Hand>
          <Mono size={12} center color={colors.onDarkSoft} style={{ maxWidth: 280, lineHeight: 18 }}>
            you can’t see each other’s profiles, lists or posts. they aren’t told you blocked them.
          </Mono>
          <Button label="unblock" tone="paper" onPress={() => unblock(blocked.id)} accessibilityLabel={`Unblock ${blocked.name}`} style={{ marginTop: 10, minWidth: 180, height: 44 }} />
        </View>
      </Screen>
    );
  }
  if (!person) {
    return (
      <Screen header={<Header />}>
        <Hand size={24} color={colors.paper}>nobody here</Hand>
        <Mono size={12} color={colors.onDarkSoft}>@{username} doesn’t exist.</Mono>
      </Screen>
    );
  }
  const rows = listsForProfile(person.id);
  const following = isFollowing(person.id);
  const follow =
    person.id === db.me ? undefined : (
      <Button
        label={following ? 'following' : 'follow'}
        tone={following ? 'outlineLight' : 'paper'}
        onPress={() => toggleFollow(person.id)}
        accessibilityLabel={following ? `Following ${person.name}. Tap to unfollow` : `Follow ${person.name}`}
        style={{ flex: 1, height: 44 }}
      />
    );
  return (
    <Screen
      refreshable
      header={
        <Header
          center={<MonoMedium size={14} color={colors.paper}>@{person.username}</MonoMedium>}
          right={person.id === db.me ? undefined : (
            <MoreMenu
              label={`More: report or block ${person.name}`}
              actions={[
                { label: 'report', danger: true, onPress: () => setReporting(true) },
                {
                  label: 'block',
                  confirm: true,
                  confirmTitle: `block @${person.username}?`,
                  confirmText: 'you won’t see each other’s profiles, lists or posts, and you’ll both stop following. they aren’t told.',
                  onPress: () => block(person),
                },
              ]}
            />
          )}
        />
      }
    >
      <ProfileHeader person={person} action={follow} />
      <ProfileTabs tab={tab} onChange={setTab} position={tracking.position} lists={rows.filter((r) => !r.invited).length} asks={asksOf(person.id).length} />
      <SwipeTabs
        tabs={PROFILE_TABS}
        tab={tab}
        onChange={setTab}
        bleed={18}
        tracking={tracking}
        pages={{
          lists: rows.length ? <FolderGrid rows={rows} /> : (
            <View style={{ paddingVertical: 48, alignItems: 'center', gap: 8 }}>
              <Hand size={22} color={colors.paper}>nothing to see yet</Hand>
              <Mono size={12} center color={colors.onDarkSoft} style={{ maxWidth: 280, lineHeight: 18 }}>
                {following
                  ? `${person.name} hasn’t shared any lists with you yet.`
                  : `${person.name}’s lists are for followers or specific people. follow to see the ones open to followers.`}
              </Mono>
            </View>
          ),
          activity: <ActivityList userId={person.id} empty={following || person.id === db.me ? `what ${person.name} adds and crosses off shows up here.` : `follow ${person.name} to see what they add and cross off.`} />,
          asks: <View style={{ marginTop: 18 }}><AskList light asks={(only) => asksOf(person.id, only)} empty={{ title: 'no asks', body: `when ${person.name} wants company, a gift, or to borrow something, it shows up here.` }} /></View>,
        }}
      />
      {reporting ? <ReportSheet what={person.username} target={{ profile_id: person.id, content: [person.name, person.bio].filter(Boolean).join(' · ') }} person={person} onClose={() => setReporting(false)} /> : null}
    </Screen>
  );
}
