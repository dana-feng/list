import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { me, saveProfile, setProfilePhoto } from '@/api/profiles';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Paper } from '@/components/Paper';
import { Label, Mono } from '@/components/Text';
import { UsernameField, usernameStatus } from '@/components/UsernameField';
import { AuthStep } from '@/screens/AuthStep';
import { pickPhotos } from '@/pickPhotos';
import { NAME_MAX } from '@/limits';
import { colors, fonts, noOutline } from '@/theme';

export default function ProfileStep() {
  useDb();
  const person = me();
  const [name, setName] = useState(person.name);
  const [username, setUsername] = useState(person.username);
  const [photo, setPhoto] = useState<string | null>(person.profile_photo);
  const [saving, setSaving] = useState(false);
  const ok = !!name.trim() && ((username === person.username && !!username) || !!usernameStatus(username, person.username)?.ok);

  const choosePhoto = async () => {
    const [uri] = await pickPhotos(false);
    if (uri) setPhoto(uri);
  };
  const next = async () => {
    setSaving(true);
    const saved = await saveProfile({ name, username });
    if (saved && photo && photo !== person.profile_photo) setProfilePhoto(photo);
    setSaving(false);
    if (saved) router.push('/friends');
  };

  return (
    <AuthStep
      step={3}
      title="who are you?"
      body="this is how friends will find you"
      footer={<Button label={saving ? 'saving…' : 'next'} tone="paper" disabled={!ok || saving} onPress={next} />}
    >
      <View style={{ alignItems: 'center', gap: 14 }}>
        <Pressable onPress={choosePhoto} accessibilityRole="button" accessibilityLabel={photo ? 'Change your photo' : 'Add a photo'}>
          {photo ? (
            <Avatar person={{ ...person, name: name || person.name, profile_photo: photo }} size={136} edge={colors.paper} />
          ) : (
            <View style={{ width: 136, height: 136, borderRadius: 41, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.paper, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Icon name="image" size={24} color={colors.paper} />
              <Mono size={11} color={colors.paper}>add photo</Mono>
            </View>
          )}
        </Pressable>
      </View>
      <Label color={colors.onDarkSoft} style={{ marginTop: 14, marginBottom: 8, marginHorizontal: 2 }}>your name</Label>
      <Paper fill={colors.paper} shape={5} style={{ height: 54, paddingHorizontal: 14, justifyContent: 'center' }}>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={NAME_MAX}
          placeholder="your name"
          placeholderTextColor={colors.inkFaint}
          textContentType="givenName"
          autoComplete="given-name"
          accessibilityLabel="Your name"
          style={[{ fontFamily: fonts.hand, fontSize: 22, color: colors.ink, height: 50 }, noOutline]}
        />
      </Paper>
      <Label color={colors.onDarkSoft} style={{ marginTop: 14, marginBottom: 8, marginHorizontal: 2 }}>pick a username</Label>
      <UsernameField value={username} onChange={setUsername} current={person.username || undefined} />
    </AuthStep>
  );
}
