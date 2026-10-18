import { ReactNode, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { BIO_MAX, me, removeProfilePhoto, saveProfile, setProfilePhoto } from '@/api/profiles';
import { deleteAccount, signOut } from '@/api/sync';
import { Avatar } from '@/components/Avatar';
import { Button, LinkText } from '@/components/Button';
import { FolderTab } from '@/components/FolderTab';
import { FeedbackSheet } from '@/components/FeedbackSheet';
import { Header, SaveAction, TextAction } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { Paper } from '@/components/Paper';
import { Sheet } from '@/components/Sheet';
import { FolderScreen } from '@/components/Screen';
import { Hand, Label, Mono, MonoMedium } from '@/components/Text';
import { usernameStatus } from '@/components/UsernameField';
import { pickPhotos, takePhoto } from '@/pickPhotos';
import { colors, fonts, noOutline } from '@/theme';

/** Settings, and the same screen as "edit profile". */
export default function Settings() {
  const db = useDb();
  const person = me();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [username, setUsername] = useState(person.username);
  const [bio, setBio] = useState(person.bio);
  const [confirming, setConfirming] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const masked = db.phone ? `+1 (${db.phone.slice(-10, -7)}) ••• ${db.phone.slice(-4)}` : '';
  const status = usernameStatus(username, person.username);
  const canSave = !!name.trim() && (username === person.username || !!status?.ok);

  // the sheet goes first, so the photo picker doesn't open under it
  const changePhoto = (from: 'library' | 'camera') => {
    setPhotoMenu(false);
    setTimeout(async () => {
      const uri = from === 'camera' ? await takePhoto() : (await pickPhotos(false))[0];
      if (uri) setProfilePhoto(uri);
    }, 0);
  };
  const deletePhoto = () => {
    setPhotoMenu(false);
    removeProfilePhoto();
  };
  const startEdit = () => {
    setName(person.name);
    setUsername(person.username);
    setBio(person.bio);
    setEditing(true);
  };
  const save = () => {
    saveProfile({ name, username, bio });
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
        header={<Header left={<TextAction label="cancel" onPress={() => setEditing(false)} />} title="edit profile" right={<SaveAction onPress={save} disabled={!canSave} />} />}
        folderTabs={<FolderTab label="you" />}
      >
        {/* the photo and the line under it both open the photo sheet */}
        <Pressable onPress={() => setPhotoMenu(true)} accessibilityRole="button" accessibilityLabel="Edit profile photo" style={{ alignSelf: 'center', marginTop: 6 }}>
          <Avatar person={person} size={104} fill={colors.sage} />
        </Pressable>
        <View style={{ alignSelf: 'center', marginBottom: 4 }}>
          <LinkText label="edit photo" size={13} onPress={() => setPhotoMenu(true)} />
        </View>
        <Field label="name">
          <TextInput value={name} onChangeText={setName} accessibilityLabel="Name" style={[styles.input, noOutline]} />
        </Field>
        <Field label="username" help={status ? (status.ok ? "that one's yours" : status.text) : undefined}>
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
        <Field label="bio" help={`${bio.length}/${BIO_MAX}`} tall>
          <TextInput
            value={bio}
            onChangeText={(t) => setBio(t.replace(/\n/g, ' '))}
            maxLength={BIO_MAX}
            multiline
            placeholder="a line or two about you"
            placeholderTextColor={colors.inkFaint}
            accessibilityLabel="Bio"
            style={[styles.input, styles.bio, noOutline]}
          />
        </Field>
        <Field label="phone number" onPress={() => router.push('/phone?change=1')}>
          <Mono size={14} style={{ flex: 1 }}>{masked}</Mono>
          <Icon name="right" size={14} strokeWidth={2.2} />
        </Field>
        {photoMenu ? (
          <Sheet onClose={() => setPhotoMenu(false)}>
            <View style={{ gap: 10, paddingBottom: 4 }}>
              <Button label="choose from library" tone="outline" onPress={() => changePhoto('library')} />
              <Button label="take photo" tone="outline" onPress={() => changePhoto('camera')} />
              {person.profile_photo ? (
                <View style={{ alignSelf: 'center' }}>
                  <LinkText label="remove photo" color={colors.bark} size={13} onPress={deletePhoto} />
                </View>
              ) : null}
            </View>
          </Sheet>
        ) : null}
      </FolderScreen>
    );
  }

  return (
    <FolderScreen header={<Header />} folderTabs={<FolderTab label="settings" />}>
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
      <Row label="blocked profiles" value={db.blocked.length ? String(db.blocked.length) : undefined} onPress={() => router.push('/blocked')} />

      <Label style={styles.label}>help</Label>
      <Row label="help + feedback" onPress={() => setFeedback(true)} />
      <Row label="terms + privacy" />

      <Button label="log out" tone="outline" onPress={leave} style={{ marginTop: 24, height: 48 }} />
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        {confirming ? (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Mono size={12} center color={colors.inkSoft} style={{ maxWidth: 260, lineHeight: 18 }}>this deletes your lists, photos and everything you’re interested in, for good.</Mono>
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
      {feedback ? <FeedbackSheet onClose={() => setFeedback(false)} /> : null}
    </FolderScreen>
  );
}

function Field({ label, help, children, onPress, tall }: { label: string; help?: string; children: ReactNode; onPress?: () => void; tall?: boolean }) {
  const box = (
    <Paper fill={colors.cream} edge="dash" edgeWidth={1.3} shape={0} round={1.3} style={[styles.field, tall && styles.tall]}>
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
  tall: { height: undefined, minHeight: 48, alignItems: 'flex-start', paddingVertical: 10 },
  bio: { height: undefined, minHeight: 44, lineHeight: 20, textAlignVertical: 'top', paddingTop: 2 },
});
