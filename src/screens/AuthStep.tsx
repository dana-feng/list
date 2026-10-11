import { ReactNode } from 'react';
import { View } from 'react-native';
import { BackButton } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Sans, Serif } from '@/components/Text';
import { colors, space } from '@/theme';

/** Shared layout for the sign-up steps: back arrow, step pips, big question, button pinned at the bottom. */
export function AuthStep({ step, title, body, children, footer }: { step: number; title: string; body?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Screen
      footer={footer}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, minHeight: 44, marginBottom: space.xl }}>
          <BackButton />
          <View style={{ flexDirection: 'row', gap: 5 }} accessibilityLabel={`Step ${step} of 4`}>
            {[1, 2, 3, 4].map((n) => (
              <View key={n} style={{ width: 22, height: 6, borderRadius: 3, backgroundColor: n <= step ? colors.dark : colors.pip }} />
            ))}
          </View>
        </View>
      }
    >
      <Serif size={34} style={{ lineHeight: 39 }}>{title}</Serif>
      {body ? <Sans size={15.5} style={{ marginTop: space.md }}>{body}</Sans> : null}
      <View style={{ marginTop: space.xl }}>{children}</View>
    </Screen>
  );
}
