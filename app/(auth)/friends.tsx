import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { matchContacts, signIn } from '@/api/profiles';
import { Button } from '@/components/Button';
import { PersonRow } from '@/components/PersonRow';
import { Sans } from '@/components/Text';
import { AuthStep } from '@/screens/AuthStep';
import { colors, space } from '@/theme';

export default function Friends() {
  useDb();
  const people = matchContacts();
  const finish = () => {
    signIn();
    router.dismissAll();
    router.replace('/');
  };
  return (
    <AuthStep
      step={4}
      title="find your people"
      body={`${people.length} ${people.length === 1 ? 'person' : 'people'} from your contacts ${people.length === 1 ? 'is' : 'are'} already here.`}
      footer={
        <View>
          <Button label="Done" onPress={finish} />
          <Pressable onPress={finish} style={{ alignItems: 'center', paddingTop: space.lg }} accessibilityRole="button">
            <Sans size={16} color={colors.inkSoft}>Skip</Sans>
          </Pressable>
        </View>
      }
    >
      <View style={{ backgroundColor: colors.cream, borderRadius: 18, paddingHorizontal: 14, marginTop: -space.sm }}>
        {people.map((p, i) => (
          <View key={p.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
            <PersonRow person={p} />
          </View>
        ))}
      </View>
    </AuthStep>
  );
}
