import { View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Sans, Serif } from '@/components/Text';
import { colors } from '@/theme';

export default function Welcome() {
  return (
    <Screen scroll={false} footer={<Button label="Get started" onPress={() => router.push('/phone')} />}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Serif size={76} style={{ lineHeight: 84 }}>list</Serif>
        <Sans size={18} color={colors.inkSoft} style={{ maxWidth: 280, lineHeight: 25 }}>
          Lists of things to do, shared with the people you'd do them with.
        </Sans>
      </View>
    </Screen>
  );
}
