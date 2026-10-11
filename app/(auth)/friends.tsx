import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Profile, useDb } from '@/api/db';
import { isFollowing, matchContacts, toggleFollow } from '@/api/profiles';
import { Button } from '@/components/Button';
import { Paper } from '@/components/Paper';
import { FollowButton } from '@/components/PersonRow';
import { SearchField } from '@/components/SearchField';
import { Avatar } from '@/components/Avatar';
import { Hand, Label, Mono } from '@/components/Text';
import { AuthStep } from '@/screens/AuthStep';
import { colors } from '@/theme';

export default function Friends() {
  useDb();
  const [people, setPeople] = useState<Profile[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    matchContacts().then(setPeople).catch(() => setPeople([]));
  }, []);

  const finish = () => {
    router.dismissAll();
    router.replace('/');
  };
  const s = q.trim().toLowerCase().replace(/^@/, '');
  const shown = (people ?? []).filter((p) => !s || p.name.toLowerCase().includes(s) || p.username.includes(s));
  const following = (people ?? []).filter((p) => isFollowing(p.id)).length;
  const all = !!people?.length && following === people.length;
  const followAll = () => (people ?? []).forEach((p) => {
    if (isFollowing(p.id) === all) toggleFollow(p.id);
  });

  return (
    <AuthStep
      step={4}
      title="find your people"
      body="lists are better with friends"
      scroll={false}
      footer={
        <View style={{ gap: 6 }}>
          <Button label={following ? `let's go · following ${following}` : "let's go"} tone="paper" onPress={finish} />
          <Pressable onPress={finish} style={{ alignSelf: 'center', minHeight: 40, justifyContent: 'center' }} accessibilityRole="button">
            <Mono size={12} color={colors.paper}>skip for now</Mono>
          </Pressable>
        </View>
      }
    >
      <Paper fill={colors.paper} edge="light" shape={5} round={1.4} style={{ flex: 1, padding: 12, paddingBottom: 0, marginHorizontal: -6 }}>
        <SearchField value={q} onChange={setQ} placeholder="name or @username" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 4, marginHorizontal: 2 }}>
          <Label>from your contacts · {people?.length ?? 0}</Label>
          {people?.length ? (
            <Pressable onPress={followAll} style={{ minHeight: 32, justifyContent: 'center', paddingHorizontal: 4 }} accessibilityRole="button">
              <Mono size={11} style={{ textDecorationLine: 'underline' }}>{all ? 'unfollow all' : 'follow all'}</Mono>
            </Pressable>
          ) : null}
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {people === null ? <ActivityIndicator color={colors.ink} style={{ marginTop: 16, alignSelf: 'flex-start' }} /> : null}
          {people && !people.length ? (
            <Mono size={12} color={colors.inkSoft} style={{ marginTop: 10, lineHeight: 18 }}>nobody from your contacts is here yet. you can find people later with search.</Mono>
          ) : null}
          {shown.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 58 }}>
              <Avatar person={p} size={38} />
              <View style={{ flex: 1, gap: 1 }}>
                <Hand size={17}>{p.name}</Hand>
                <Mono size={10.5} color={colors.inkSoft}>@{p.username}</Mono>
              </View>
              <FollowButton userId={p.id} />
            </View>
          ))}
        </ScrollView>
      </Paper>
    </AuthStep>
  );
}
