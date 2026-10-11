import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Profile, useDb } from '@/api/db';
import { matchContacts } from '@/api/profiles';
import { Button } from '@/components/Button';
import { PersonRow } from '@/components/PersonRow';
import { Sans } from '@/components/Text';
import { AuthStep } from '@/screens/AuthStep';
import { colors, space } from '@/theme';

export default function Friends() {
  useDb();
  const [people, setPeople] = useState<Profile[] | null>(null);

  useEffect(() => {
    matchContacts().then(setPeople).catch(() => setPeople([]));
  }, []);

  const finish = () => {
    router.dismissAll();
    router.replace('/');
  };
  const body =
    people === null
      ? 'Checking your contacts…'
      : people.length
        ? `${people.length} ${people.length === 1 ? 'person' : 'people'} from your contacts ${people.length === 1 ? 'is' : 'are'} already here.`
        : 'Nobody from your contacts is here yet. You can find people later with search.';

  return (
    <AuthStep
      step={4}
      title="find your people"
      body={body}
      footer={
        <View>
          <Button label="Done" onPress={finish} />
          <Pressable onPress={finish} style={{ alignItems: 'center', paddingTop: space.lg }} accessibilityRole="button">
            <Sans size={16} color={colors.inkSoft}>Skip</Sans>
          </Pressable>
        </View>
      }
    >
      {people === null ? <ActivityIndicator color={colors.ink} style={{ alignSelf: 'flex-start' }} /> : null}
      {people?.length ? (
        <View style={{ backgroundColor: colors.cream, borderRadius: 18, paddingHorizontal: 14, marginTop: -space.sm }}>
          {people.map((p, i) => (
            <View key={p.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
              <PersonRow person={p} />
            </View>
          ))}
        </View>
      ) : null}
    </AuthStep>
  );
}
