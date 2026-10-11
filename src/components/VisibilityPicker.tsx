import { Pressable, View } from 'react-native';
import type { Visibility } from '@/api/db';
import { colors } from '@/theme';
import { Icon } from './Icon';
import { Paper } from './Paper';
import { Mono, MonoMedium } from './Text';

/** Who can see a list: followers, specific people, anyone, or just the people on it. */
export type Choice = Visibility;

export function choiceLabel(choice: Choice, viewers: number) {
  if (choice === 'specific') return `${viewers} ${viewers === 1 ? 'person' : 'people'}`;
  if (choice === 'just_me') return 'just me';
  return choice;
}

const OPTIONS: { value: Choice; title: string; sub: string }[] = [
  { value: 'followers', title: 'followers', sub: 'people who follow you' },
  { value: 'specific', title: 'specific people', sub: 'only people you pick' },
  { value: 'anyone', title: 'anyone', sub: 'anyone who finds your profile' },
  { value: 'just_me', title: 'just me', sub: 'only the people on it' },
];

/** The dashed "who can see" button: people icon, current choice, chevron. */
export function VisibilityButton({ label, onPress, open, disabled }: { label: string; onPress?: () => void; open?: boolean; disabled?: boolean }) {
  return (
    <Paper
      onPress={onPress}
      disabled={disabled || !onPress}
      edge={onPress ? 'dash' : 'none'}
      edgeWidth={1.3}
      shape={2}
      round={1.2}
      accessibilityLabel={`Who can see it: ${label}`}
      accessibilityState={{ expanded: open }}
      style={{ height: 30, paddingHorizontal: onPress ? 10 : 0, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
    >
      <Icon name="people" size={15} strokeWidth={1.7} />
      <Mono size={11.5}>{label}</Mono>
      {onPress ? <Icon name="down" size={13} /> : null}
    </Paper>
  );
}

/** The dropdown of choices under that button. Picking "specific people" opens the people picker instead. */
export function VisibilityMenu({ value, onPick }: { value: Choice; onPick: (c: Choice) => void }) {
  return (
    <Paper fill={colors.cream} edge="ink" shape={3} style={{ padding: 6, marginTop: 6, shadowColor: '#3A1000', shadowOpacity: 0.25, shadowRadius: 9, shadowOffset: { width: 0, height: 8 } }} accessibilityRole={undefined}>
      {OPTIONS.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onPick(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, backgroundColor: on ? colors.sage : 'transparent', minHeight: 44 }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <MonoMedium size={12}>{o.title}</MonoMedium>
              <Mono size={10} color={colors.inkSoft}>{o.sub}</Mono>
            </View>
            {on ? <Icon name="check" size={16} strokeWidth={2.2} /> : null}
          </Pressable>
        );
      })}
    </Paper>
  );
}
