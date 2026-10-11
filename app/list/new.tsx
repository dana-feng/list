import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { createList, listDraft, resetDraft, updateDraft } from '@/api/lists';
import { getProfile, me } from '@/api/profiles';
import { Avatar, AvatarStack } from '@/components/Avatar';
import { Dots } from '@/components/Dots';
import { FolderCard } from '@/components/FolderCard';
import { goBack, Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Mono, Sans, SansBold } from '@/components/Text';
import { TextAction } from '@/components/TextAction';
import { TitleField } from '@/components/TitleField';
import { VisibilityPicker } from '@/components/VisibilityPicker';
import { colors, space } from '@/theme';

/** Start a list: name it, invite people, choose who sees it. */
export default function NewList() {
  useDb();
  useEffect(() => resetDraft, []);
  const draft = listDraft;
  const invited = draft.invites.map((id) => getProfile(id)!).filter(Boolean);
  const label = draft.visibility === 'specific' ? `${draft.viewers.length} ${draft.viewers.length === 1 ? 'person' : 'people'}` : draft.visibility;

  const create = () => {
    const id = createList(draft);
    router.replace(`/list/${id}`);
  };

  return (
    <Screen
      header={
        <Header
          left={<TextAction label="Cancel" quiet onPress={goBack} />}
          right={<TextAction label="Create" disabled={!draft.title.trim()} onPress={create} />}
        />
      }
    >
      <FolderCard tab="new list" style={{ marginHorizontal: -4, marginTop: space.lg }}>
        <TitleField editing value={draft.title} onChange={(title) => updateDraft({ title })} placeholder="name your list" autoFocus />

        <Mono size={13} style={{ marginTop: space.xl, marginBottom: space.md }}>who's on it</Mono>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar person={me()} size={34} />
          <View style={{ flex: 1 }}>
            <SansBold size={16}>you <Mono color={colors.inkSoft}>· owner</Mono></SansBold>
            <Sans size={12.5} color={colors.inkSoft}>people on it can add + check off things</Sans>
          </View>
          <Pressable onPress={() => router.push('/list/new/people?mode=members')} hitSlop={10} accessibilityRole="button">
            <SansBold size={15}>+ invite</SansBold>
          </Pressable>
        </View>
        {invited.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md }}>
            <AvatarStack people={invited} size={26} max={6} />
            <Sans size={13.5} color={colors.inkSoft}>{invited.map((p) => p.name).join(', ')} will get an invite</Sans>
          </View>
        ) : null}

        <Dots gap={space.xl} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.lg }}>
          <Mono size={13}>who can see it</Mono>
          <SansBold size={16}>{label}</SansBold>
        </View>
        <VisibilityPicker
          value={draft.visibility}
          specificCount={draft.viewers.length}
          onChange={(visibility) => updateDraft({ visibility })}
          onPickPeople={() => router.push('/list/new/people?mode=viewers')}
        />
      </FolderCard>
    </Screen>
  );
}
