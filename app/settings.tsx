import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { me, signOut, updateProfile } from '@/api/profiles';
import { Avatar } from '@/components/Avatar';
import { BackButton, Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Mono, Sans, SansBold, Serif } from '@/components/Text';
import { TextAction } from '@/components/TextAction';
import { TitleField } from '@/components/TitleField';
import { UsernameField, usernameStatus } from '@/components/UsernameField';
import { pickPhotos } from '@/pickPhotos';
import { colors, space } from '@/theme';

/** Settings, and the same screen in edit mode. */
export default function Settings() {
  const db = useDb();
  const person = me();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [username, setUsername] = useState(person.username);
  const [confirming, setConfirming] = useState(false);
  const maskedPhone = `(•••) •••-${db.phone.slice(-4)}`;
  const status = usernameStatus(username, person.username);
  const canSave = !!name.trim() && (username === person.username || !!status?.ok);

  const changePhoto = async () => {
    const [uri] = await pickPhotos(false);
    if (uri) updateProfile({ avatar_path: uri });
  };
  const startEdit = () => {
    setName(person.name);
    setUsername(person.username);
    setEditing(true);
  };
  const save = () => {
    updateProfile({ name: name.trim(), username });
    setEditing(false);
  };
  const leave = () => {
    signOut();
    router.dismissAll();
    router.replace('/welcome');
  };

  const photoRow = (
    <View style={styles.row}>
      <Avatar person={person} size={38} />
      <SansBold size={16} style={{ flex: 1 }}>Profile photo</SansBold>
      <Pressable onPress={changePhoto} hitSlop={10} accessibilityRole="button">
        <SansBold size={15} style={{ textDecorationLine: 'underline' }}>Change</SansBold>
      </Pressable>
    </View>
  );

  if (editing) {
    return (
      <Screen
        header={
          <Header
            left={<><TextAction label="Cancel" quiet onPress={() => setEditing(false)} /><Serif size={30}>edit</Serif></>}
            right={<TextAction label="Save" disabled={!canSave} onPress={save} />}
          />
        }
      >
        <Mono size={13} style={styles.label}>account</Mono>
        <Card>
          {photoRow}
          <Rule />
          <View style={styles.field}>
            <Mono color={colors.inkSoft} style={{ marginBottom: 6 }}>name</Mono>
            <TitleField editing value={name} onChange={setName} size={20} placeholder="your name" />
          </View>
          <Rule />
          <View style={styles.field}>
            <Mono color={colors.inkSoft} style={{ marginBottom: 6 }}>username</Mono>
            <UsernameField variant="underline" value={username} onChange={setUsername} current={person.username} />
          </View>
          <Rule />
          <Pressable style={styles.row} onPress={() => router.push('/phone?change=1')} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Mono color={colors.inkSoft}>phone number</Mono>
              <Sans size={16}>{maskedPhone}</Sans>
            </View>
            <Sans size={14} color={colors.inkSoft}>change · we'll text a code   ›</Sans>
          </Pressable>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen header={<Header left={<><BackButton /><Serif size={30}>settings</Serif></>} right={<TextAction label="Edit" onPress={startEdit} />} />}>
      <Mono size={13} style={styles.label}>account</Mono>
      <Card>
        {photoRow}
        <Rule />
        <LinkRow label="Name" value={person.name} onPress={startEdit} />
        <Rule />
        <LinkRow label="Username" value={`@${person.username}`} onPress={startEdit} />
        <Rule />
        <LinkRow label="Phone number" value={maskedPhone} onPress={startEdit} />
      </Card>

      <Mono size={13} style={[styles.label, { marginTop: space.xl }]}>help</Mono>
      <Card>
        <LinkRow label="Send feedback" />
        <Rule />
        <LinkRow label="Privacy policy" />
        <Rule />
        <LinkRow label="Terms" />
      </Card>

      <Pressable onPress={leave} style={styles.center} accessibilityRole="button">
        <SansBold size={16}>Log out</SansBold>
      </Pressable>
      {confirming ? (
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <Sans center color={colors.inkSoft} style={{ maxWidth: 280 }}>This deletes your lists, photos and stars for good.</Sans>
          <View style={{ flexDirection: 'row', gap: space.xl }}>
            <Pressable onPress={leave} hitSlop={8} accessibilityRole="button"><SansBold color={colors.danger}>Delete everything</SansBold></Pressable>
            <Pressable onPress={() => setConfirming(false)} hitSlop={8} accessibilityRole="button"><SansBold>Keep account</SansBold></Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setConfirming(true)} style={styles.center} accessibilityRole="button">
          <SansBold size={16} color={colors.danger}>Delete account</SansBold>
        </Pressable>
      )}
    </Screen>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: colors.cream, borderRadius: 18, paddingHorizontal: 14, marginHorizontal: -4 }}>{children}</View>;
}

function Rule() {
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}

function LinkRow({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <Sans size={16} style={{ flex: 1 }}>{label}</Sans>
      {value ? <Sans size={15} color={colors.inkSoft}>{value}</Sans> : null}
      <Sans size={18} color={colors.inkSoft}>›</Sans>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: 8 },
  field: { paddingVertical: 12 },
  center: { alignItems: 'center', paddingVertical: space.md, marginTop: space.lg },
});
