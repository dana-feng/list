import { Pressable, StyleSheet, View } from 'react-native';
import type { Visibility } from '@/api/db';
import { colors } from '@/theme';
import { Icon } from './Icon';
import { Sans, SansBold } from './Text';

const OPTIONS: { value: Visibility; title: string; body: string }[] = [
  { value: 'anyone', title: 'Anyone', body: 'anyone with the link or your profile' },
  { value: 'followers', title: 'Followers', body: 'people who follow you' },
  { value: 'specific', title: 'Specific people', body: 'select from your followers' },
];

/** Anyone / Followers / Specific people. Choosing the last one opens the follower picker. */
export function VisibilityPicker({ value, onChange, onPickPeople, specificCount }: { value: Visibility; onChange: (v: Visibility) => void; onPickPeople: () => void; specificCount: number }) {
  return (
    <View style={styles.box} accessibilityRole="radiogroup">
      {OPTIONS.map((o) => {
        const on = o.value === value;
        const specific = o.value === 'specific';
        return (
          <Pressable
            key={o.value}
            onPress={() => (specific ? onPickPeople() : onChange(o.value))}
            style={[styles.option, on && { backgroundColor: colors.folder }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <View style={{ flex: 1 }}>
              <SansBold size={16}>{o.title}</SansBold>
              <Sans size={13.5} color={colors.inkSoft}>
                {specific && on ? `${specificCount} selected · change` : o.body}
              </Sans>
            </View>
            {specific ? (
              <Icon name="right" size={18} />
            ) : (
              <View style={[styles.radio, on && { backgroundColor: colors.dark, borderColor: colors.dark }]}>
                {on ? <View style={styles.radioDot} /> : null}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.paper, borderRadius: 16, borderWidth: 1.5, borderColor: colors.ink, padding: 4 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 11 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.inkSoft, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.paper },
});
