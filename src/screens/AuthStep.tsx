import { ReactNode } from 'react';
import { View } from 'react-native';
import { BackButton, Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Hand, Mono } from '@/components/Text';
import { colors, fonts } from '@/theme';

/** Shared layout for the sign-up steps: back arrow (or the name on step 1, unless there's somewhere to go back to), step marks, big question, button at the bottom. */
export function AuthStep({ step, title, body, children, footer, scroll = true, back = step > 1 }: { step: number; title: string; body?: string; children: ReactNode; footer?: ReactNode; scroll?: boolean; back?: boolean }) {
  return (
    <Screen
      scroll={scroll}
      footer={footer}
      contentStyle={{ paddingHorizontal: 20 }}
      header={
        <Header
          left={!back ? <Hand size={24} color={colors.paper} style={{ paddingLeft: 6, fontFamily: fonts.handBold }}>list</Hand> : <BackButton />}
          center={
            <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Step ${step} of 4`}>
              {[1, 2, 3, 4].map((n) => (
                <View key={n} style={{ width: 26, height: 4, borderRadius: 2, backgroundColor: colors.paper, opacity: n <= step ? 1 : 0.3 }} />
              ))}
            </View>
          }
        />
      }
    >
      <View style={{ marginTop: 26, marginHorizontal: 4, gap: 8 }}>
        <Hand size={34} color={colors.paper} style={{ lineHeight: 37 }}>{title}</Hand>
        {body ? <Mono size={12} color={colors.onDarkSoft} style={{ lineHeight: 19 }}>{body}</Mono> : null}
      </View>
      <View style={{ marginTop: 26, flex: scroll ? undefined : 1 }}>{children}</View>
    </Screen>
  );
}
