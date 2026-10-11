import { ReactNode, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { me, saveProfile, setProfilePhoto } from '@/api/profiles';
import { deleteAccount, signOut } from '@/api/sync';
import { Avatar } from '@/components/Avatar';
import { Button, LinkText } from '@/components/Button';
import { FolderTab } from '@/components/FolderTab';
import { Header, SaveAction, TextAction } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { Paper } from '@/components/Paper';
import { FolderScreen } from '@/components/Screen';
import { Hand, Label, Mono, MonoMedium } from '@/components/Text';
import { usernameStatus } from '@/components/UsernameField';
import { pickPhotos } from '@/pickPhotos';
import { colors, fonts, noOutline } from '@/theme';

/** Settings, and the same screen as "edit profile". */
export default function Settings() {
  const db = useDb();
  const person = me();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [username, setUsername] = useState(person.username);
  const [confirming, setConfirming] = useState(false);
  const masked = db.phone ? `+1 (${db.phone.slice(-10, -7)}) ••• ${db.phone.slice(-4)}` : '';
  const status = usernameStatus(username, person.username);
  const canSave = !!name.trim() && (username === person.username || !!status?.ok);

  const changePhoto = async () => {
    const [uri] = await pickPhotos(false);
    if (uri) setProfilePhoto(uri);
  };
  const startEdit = () => {
    setName(person.name);
    setUsername(person.username);
    setEditing(true);
  };
  const save = () => {
    saveProfile({ name, username });
    setEditing(false);
  };
  const leave = async () => {
    await signOut();
    router.dismissAll();
    router.replace('/welcome');
  };
  const destroy = async () => {
    const problem = await deleteAccount();
    if (problem) return Alert.alert("Couldn't delete your account", problem);
    router.dismissAll();
    router.replace('/welcome');
  };

  if (editing) {
    return (
      <FolderScreen
        tabs="lists"
        header={<Header left={<TextAction label="cancel" onPress={() => setEditing(false)} />} title="edit profile" right={<SaveAction onPress={save} disabled={!canSave} />} />}
        folderTabs={<FolderTab label="you" />}
      >
        <View style={{ alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Avatar person={person} size={104} fill={colors.sage} />
          <Paper onPress={changePhoto} edge="dash" edgeWidth={1.2} shape={2} round={1.3} style={{ height: 34, paddingHorizontal: 12, justifyContent: 'center' }}>
            <Mono size={11.5}>change photo</Mono>
          </Paper>
        </View>
        <Field label="name">
          <TextInput value={name} onChangeText={setName} accessibilityLabel="Name" style={[styles.input, noOutline]} />
        </Field>
        <Field label="username" help={status ? (status.ok ? "✓ that one's yours" : status.text) : undefined}>
          <Mono size={14} color={colors.inkSoft}>@</Mono>
          <TextInput
            value={username}
            onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, ''))}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Username"
            style={[styles.input, noOutline]}
          />
        </Field>
        <Field label="phone number" help="we'll text a code to confirm a new number" onPress={() => router.push('/phone?change=1')}>
          <Mono size={14} style={{ flex: 1 }}>{masked}</Mono>
          <Icon name="right" size={14} strokeWidth={2.2} />
        </Field>
      </FolderScreen>
    );
  }

  return (
    <FolderScreen tabs="lists" header={<Header title="settings" />} folderTabs={<FolderTab label="you + your account" />}>
      <Paper onPress={startEdit} fill={colors.sage} edge="ink" shape={4} lean={2} style={styles.me} accessibilityLabel="Edit profile">
        <Avatar person={person} size={52} fill={colors.cream} />
        <View style={{ flex: 1, gap: 2 }}>
          <Hand size={22}>{person.name}</Hand>
          <Mono size={11} color={colors.inkSoft}>@{person.username}</Mono>
        </View>
        <MonoMedium size={12}>edit</MonoMedium>
        <Icon name="right" size={14} strokeWidth={2.2} />
      </Paper>

      <Label style={styles.label}>account</Label>
      <Row label="phone number" value={masked} onPress={startEdit} />

      <Label style={styles.label}>help</Label>
      <Row label="help + feedback" />
      <Row label="terms + privacy" />

      <Button label="log out" tone="outline" onPress={leave} style={{ marginTop: 24, height: 48 }} />
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        {confirming ? (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Mono size={12} center color={colors.inkSoft} style={{ maxWidth: 260, lineHeight: 18 }}>this deletes your lists, photos and everything you’re down for, for good.</Mono>
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <LinkText label="delete everything" color={colors.bark} onPress={destroy} />
              <LinkText label="keep my account" onPress={() => setConfirming(false)} />
            </View>
          </View>
        ) : (
          <LinkText label="delete my account" color={colors.bark} onPress={() => setConfirming(true)} />
        )}
        <Mono size={10} color={colors.inkFaint} style={{ marginTop: 8 }}>list v{Constants.expoConfig?.version ?? ''}</Mono>
      </View>
    </FolderScreen>
  );
}

function Field({ label, help, children, onPress }: { label: string; help?: string; children: ReactNode; onPress?: () => void }) {
  const box = (
    <Paper fill={colors.cream} edge="dash" edgeWidth={1.3} shape={0} round={1.3} style={styles.field}>
      {children}
    </Paper>
  );
  return (
    <View style={{ marginTop: 18 }}>
      <Label style={{ marginHorizontal: 2, marginBottom: 8 }}>{label}</Label>
      {onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Change ${label}`}>{box}</Pressable> : box}
      {help ? <Mono size={10.5} color={colors.inkSoft} style={{ marginTop: 6, marginHorizontal: 2 }} accessibilityLiveRegion="polite">{help}</Mono> : null}
    </View>
  );
}

function Row({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row} accessibilityRole={onPress ? 'button' : undefined}>
      <Mono size={12.5}>{label}</Mono>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {value ? <Mono size={11.5} color={colors.inkSoft}>{value}</Mono> : null}
        <Icon name="right" size={14} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  me: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  label: { marginTop: 22, marginBottom: 8, marginHorizontal: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 4, borderBottomWidth: 1.2, borderStyle: 'dashed', borderColor: colors.rule },
  field: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 48, paddingHorizontal: 14 },
  input: { flex: 1, fontFamily: fonts.mono, fontSize: 14, color: colors.ink, height: 44 },
});
