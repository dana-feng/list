import { View } from 'react-native';
import { db, Profile } from '@/api/db';
import { listsForProfile } from '@/api/lists';
import { isFollowing } from '@/api/profiles';
import { PersonRow } from './PersonRow';

/** What we can say about someone in a short line: "follows you · 4 lists". */
export function personNote(p: Profile) {
  const bits: string[] = [];
  if (p.id !== db.me && isFollowing(db.me, p.id)) bits.push('follows you');
  const lists = listsForProfile(p.id).filter((r) => !r.invited).length;
  if (lists) bits.push(`${lists} ${lists === 1 ? 'list' : 'lists'}`);
  return bits.join(' · ') || undefined;
}

/** A stack of people slips, each with a follow button; tapping one opens their profile. `fill`: all one paper instead of alternating. */
export function PeopleList({ people, notes, fill }: { people: Profile[]; notes?: boolean; fill?: string }) {
  return (
    <View style={{ gap: 8 }}>
      {people.map((p, i) => <PersonRow key={p.id} person={p} index={i} sub={notes ? personNote(p) : undefined} fill={fill} />)}
    </View>
  );
}
