import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { List } from '@/api/db';
import { invitedBy, listPeople, listProgress, progressLabel, respondInvite, visibilityLabel } from '@/api/lists';
import { colors, isDark, space, swatchFor } from '@/theme';
import { Avatar, AvatarStack } from './Avatar';
import { FolderCard } from './FolderCard';
import { Icon } from './Icon';
import { ProgressBar } from './ProgressBar';
import { Mono, Sans, SansBold, Serif } from './Text';

/** A list on a profile grid. `invited` is the yellow folder with Join / No thanks. */
export function ListFolderCard({ list, invited, own }: { list: List; invited?: boolean; own?: boolean }) {
  const { done, total } = listProgress(list.id);
  const cover = swatchFor(list.id);
  const dark = isDark(cover);
  const open = () => router.push(`/list/${list.id}`);
  const inviter = invitedBy(list.id);
  return (
    <FolderCard
      tab={invited ? 'invited' : progressLabel(list.id)}
      tabColor={invited ? colors.gold : undefined}
      color={invited ? colors.cream : colors.folder}
      padding={6}
      style={{ marginBottom: space.lg }}
      bodyStyle={invited && { borderWidth: 2, borderColor: colors.gold }}
    >
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={list.title}>
        <View style={[styles.cover, { backgroundColor: cover }]}>
          <Icon name="image" size={18} color={dark ? colors.onDark : colors.ink} />
        </View>
        <View style={styles.text}>
          <Serif size={17.5} style={{ lineHeight: 21 }}>{list.title}</Serif>
          {invited ? (
            <View style={styles.meta}>
              {inviter ? <Avatar person={inviter} size={20} /> : null}
              <Sans size={13} color={colors.inkSoft} style={{ flex: 1 }}>{inviter?.name} invited you</Sans>
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              <ProgressBar done={done} total={total} height={6} />
            </View>
          )}
          {own && !invited ? (
            <View style={[styles.meta, { justifyContent: 'space-between' }]}>
              <AvatarStack people={listPeople(list.id)} size={22} />
              <Mono size={11.5} color={colors.inkSoft}>{visibilityLabel(list)}</Mono>
            </View>
          ) : null}
        </View>
      </Pressable>
      {invited ? (
        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={() => respondInvite(list.id, true)} accessibilityRole="button">
            <SansBold size={15}>Join</SansBold>
          </Pressable>
          <View style={{ width: 1.5, height: 22, backgroundColor: colors.line }} />
          <Pressable style={styles.action} onPress={() => respondInvite(list.id, false)} accessibilityRole="button">
            <Sans size={14} color={colors.inkSoft}>No thanks</Sans>
          </Pressable>
        </View>
      ) : null}
    </FolderCard>
  );
}

const styles = StyleSheet.create({
  cover: { height: 82, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  text: { paddingHorizontal: 6, paddingTop: 10, paddingBottom: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  actions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1.5, borderStyle: 'dotted', borderColor: colors.line, marginHorizontal: 4 },
  action: { flex: 1, alignItems: 'center', paddingVertical: 11 },
});
