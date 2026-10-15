import { ReactNode, useState } from 'react';
import { Insets, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { Profile } from '@/api/db';
import { names } from '@/lib';
import { colors } from '@/theme';
import { openProfile, PersonRow } from './PersonRow';
import { Sheet } from './Sheet';

/** Everyone behind a row of faces, each with a follow button; tapping one closes the sheet and opens their profile. */
export function PeopleSheet({ people, onClose, go = (to) => to() }: {
  people: Profile[];
  onClose: () => void;
  go?: (to: () => void) => void;
}) {
  const open = (p: Profile) => {
    onClose();
    setTimeout(() => go(() => openProfile(p)), 0);
  };
  return (
    <Sheet onClose={onClose}>
      <View style={{ gap: 8, paddingBottom: 4 }}>
        {people.map((p, i) => <PersonRow key={p.id} person={p} index={i} onPress={() => open(p)} fill={colors.cream} />)}
      </View>
    </Sheet>
  );
}

/**
 * Faces (and names) you can tap: one person goes straight to their profile, more than one opens a sheet of them.
 * `go` is for when this sits inside another sheet, which has to close before going anywhere.
 */
export function PeoplePress({ people, go = (to) => to(), style, hitSlop, children }: {
  people: Profile[];
  go?: (to: () => void) => void;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number | Insets;
  children: ReactNode;
}) {
  const [showing, setShowing] = useState(false);
  const solo = people.length === 1 ? people[0] : null;
  return (
    <>
      <Pressable
        onPress={() => (solo ? go(() => openProfile(solo)) : setShowing(true))}
        disabled={!people.length}
        hitSlop={hitSlop}
        style={style}
        accessibilityRole="button"
        accessibilityLabel={solo ? `${solo.name}'s profile` : `${names(people)}. Show everyone`}
      >
        {children}
      </Pressable>
      {showing ? <PeopleSheet people={people} go={go} onClose={() => setShowing(false)} /> : null}
    </>
  );
}
