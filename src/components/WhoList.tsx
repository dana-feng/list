import { View } from 'react-native';
import type { Profile } from '@/api/db';
import { colors } from '@/theme';
import { Paper } from './Paper';
import { PersonRow } from './PersonRow';
import { Hand, Mono } from './Text';

/** One person on a gift or borrow ask. No `person`: "someone" (a surprise, or someone we can't show). */
export type WhoEntry = { person?: Profile; quantity: number };

/**
 * Who's getting a gift, or who has the thing for a borrow ask: a slip each, like the people lists.
 * Named people open their profile; "someone" is a blank slip. With `counted`, each slip says how many.
 */
export function WhoList({ entries, counted }: { entries: WhoEntry[]; counted?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      {entries.map((e, i) => {
        const count = counted ? <Mono size={12} style={{ paddingRight: 6 }}>× {e.quantity}</Mono> : null;
        return e.person ? (
          <PersonRow key={e.person.id} person={e.person} index={i} fill={colors.cream} right={count ?? undefined} />
        ) : (
          <Paper key={`someone${i}`} fill={colors.cream} shape={i} lean={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingLeft: 12 }} accessibilityLabel={counted ? `Someone, ${e.quantity}` : 'Someone'}>
            <View style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Hand size={18}>?</Hand>
            </View>
            <Hand size={17} style={{ flex: 1 }}>someone</Hand>
            {count}
          </Paper>
        );
      })}
    </View>
  );
}
