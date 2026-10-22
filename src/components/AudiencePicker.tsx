import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { Profile } from '@/api/db';
import { getProfile, myFollowers } from '@/api/profiles';
import { colors, corners } from '@/theme';
import { Avatar } from './Avatar';
import { Icon, IconName } from './Icon';
import { SearchField } from './SearchField';
import { Hand, Mono, MonoMedium } from './Text';
import { Surface } from './Surface';

/** `icon`: the small picture beside the choice (people for followers, a globe for anyone…). */
export type AudienceOption<T> = { value: T; title: string; icon?: IconName };

type Props<T extends string> = {
  /** Every choice, top to bottom. The one whose value is 'specific' opens the people list under it. */
  options: AudienceOption<T>[];
  value: T;
  /** Who's ticked for 'specific'. */
  people: string[];
  onChange: (value: T, people: string[]) => void;
  /** People who can't be picked (they're already in). */
  locked?: string[];
};

/** A filled radio dot, or an empty one. */
function Radio({ on }: { on: boolean }) {
  return <View style={[styles.radio, on && styles.radioOn]} />;
}

/** A ticked box, or an empty one. */
function Tick({ on }: { on: boolean }) {
  return on ? (
    <View style={[styles.box, { backgroundColor: colors.bark, borderColor: colors.bark }]}><Surface tone="dark"><Icon name="check" size={14} color={colors.paper} strokeWidth={3} /></Surface></View>
  ) : (
    <View style={styles.box} />
  );
}

/**
 * "who's invited" and "who can see it": one choice from a short list, and for "specific people"
 * a search and a ticklist of your followers right under it. Used inside a Sheet.
 */
export function AudiencePicker<T extends string>({ options, value, people, onChange, locked = [] }: Props<T>) {
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase().replace(/^@/, '');
  // your followers, plus anyone already picked who isn't one (so they can be unticked)
  const pool: Profile[] = [...myFollowers()];
  people.forEach((id) => {
    const p = getProfile(id);
    if (p && !pool.some((x) => x.id === id)) pool.push(p);
  });
  const shown = pool.filter((p) => !locked.includes(p.id) && (p.name.toLowerCase().includes(s) || p.username.includes(s)));
  const toggle = (id: string) => onChange(value, people.includes(id) ? people.filter((x) => x !== id) : [...people, id]);

  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup">
      {options.map((o, i) => {
        const on = o.value === value;
        const specific = o.value === 'specific';
        const row = (
          <Pressable
            onPress={() => onChange(o.value, specific ? people : [])}
            style={styles.option}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
          >
            <Radio on={on} />
            {o.icon ? <Icon name={o.icon} size={16} strokeWidth={1.7} /> : null}
            {on ? <MonoMedium size={14}>{specific && people.length ? `${o.title} · ${people.length}` : o.title}</MonoMedium> : <Mono size={14}>{o.title}</Mono>}
          </Pressable>
        );
        if (!(specific && on)) {
          return <View key={o.value} style={[styles.card, corners(i), on && { backgroundColor: colors.sage }]}>{row}</View>;
        }
        return (
          <View key={o.value} style={[styles.card, corners(i), { backgroundColor: colors.sage, paddingBottom: 8 }]}>
            {row}
            <View style={{ marginHorizontal: 10, marginBottom: 4 }}>
              <SearchField value={q} onChange={setQ} placeholder="search people" />
            </View>
            {/* only the people scroll: the choices and the search stay put */}
            <ScrollView style={{ maxHeight: 272 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
            {shown.map((p) => {
              const ticked = people.includes(p.id);
              return (
                <Pressable key={p.id} onPress={() => toggle(p.id)} style={styles.person} accessibilityRole="checkbox" accessibilityState={{ checked: ticked }} accessibilityLabel={p.name}>
                  <Avatar person={p} size={30} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Hand size={16}>{p.name}</Hand>
                    <Mono size={10.5} color={colors.inkSoft}>@{p.username}</Mono>
                  </View>
                  <Tick on={ticked} />
                </Pressable>
              );
            })}
            </ScrollView>
            {!shown.length ? (
              <Mono size={12} color={colors.inkSoft} style={{ marginHorizontal: 14, marginTop: 8, lineHeight: 18 }}>
                {s ? 'no one by that name.' : 'once people follow you, you can pick them here.'}
              </Mono>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderColor: colors.ink },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.8, borderColor: colors.ink, backgroundColor: colors.cream },
  radioOn: { backgroundColor: colors.olive, borderWidth: 1.8, boxShadow: `inset 0 0 0 3px ${colors.cream}` },
  person: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  box: { width: 22, height: 22, borderWidth: 1.8, borderColor: colors.ink, borderTopLeftRadius: 6, borderTopRightRadius: 4, borderBottomRightRadius: 6, borderBottomLeftRadius: 5, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
});
