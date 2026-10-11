import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { me, updateProfile } from '@/api/profiles';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Mono } from '@/components/Text';
import { UsernameField, usernameStatus } from '@/components/UsernameField';
import { AuthStep } from '@/screens/AuthStep';
import { pickPhotos } from '@/pickPhotos';
import { colors, fonts, noOutline, space } from '@/theme';

export default function ProfileStep() {
  useDb();
  const person = me();
  const [name, setName] = useState(person.name);
  const [username, setUsername] = useState(person.username);
  const ok = !!name.trim() && !!usernameStatus(username)?.ok;

  const choosePhoto = async () => {
    const [uri] = await pickPhotos(false);
    if (uri) updateProfile({ avatar_path: uri });
  };
  const next = () => {
    updateProfile({ name: name.trim(), username });
    router.push('/friends');
  };

  return (
    <AuthStep step={3} title="who are you?" footer={<Button label="Next" disabled={!ok} onPress={next} />}>
      <Pressable onPress={choosePhoto} style={{ alignSelf: 'center', marginTop: -space.sm }} accessibilityRole="button" accessibilityLabel="Add a profile photo">
        {person.avatar_path ? (
          <Avatar person={person} size={110} ring={colors.cream} />
        ) : (
          <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: colors.paper, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.inkSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="camera" size={22} />
          </View>
        )}
      </Pressable>
      <Mono color={colors.inkSoft} style={{ marginTop: space.lg, marginBottom: space.sm }}>your name</Mono>
      <TextInput
        value={name}
        onChangeText={setName}
        textContentType="givenName"
        autoComplete="given-name"
        accessibilityLabel="Your name"
        style={{ height: 56, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.ink, fontFamily: fonts.serif, fontSize: 20, color: colors.ink, ...noOutline }}
      />
      <Mono color={colors.inkSoft} style={{ marginTop: space.lg, marginBottom: space.sm }}>username</Mono>
      <UsernameField value={username} onChange={setUsername} />
    </AuthStep>
  );
}
