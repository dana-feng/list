import { View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Hand, Mono } from '@/components/Text';
import { colors, fonts } from '@/theme';

export default function Welcome() {
  return (
    <Screen scroll={false} footer={<Button label="get started" tone="paper" onPress={() => router.push('/phone')} />}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 6 }}>
        <Hand size={76} color={colors.paper} style={{ lineHeight: 84, fontFamily: fonts.handBold }}>list</Hand>
        <Mono size={14} color={colors.onDarkSoft} style={{ maxWidth: 280, lineHeight: 22 }}>
          lists of things to do, shared with the people you’d do them with.
        </Mono>
      </View>
    </Screen>
  );
}
