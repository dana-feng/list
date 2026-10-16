import { useState } from 'react';
import { View } from 'react-native';
import type { ItemTag } from '@/api/db';
import { Ask } from '@/api/feed';
import { tap } from '@/haptics';
import { colors } from '@/theme';
import { AskRow } from './AskRow';
import { Icon } from './Icon';
import { Paper } from './Paper';
import { TAG_ICON } from './TagField';
import { Hand, Mono } from './Text';

const TAGS: ItemTag[] = ['invite', 'gift', 'borrow'];

/** Three optional filters: none on shows everything; tap one or more to narrow it down. */
function Filters({ on, onChange, light }: { on: ItemTag[]; onChange: (on: ItemTag[]) => void; light?: boolean }) {
  const ink = light ? colors.paper : colors.ink;
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }} accessibilityLabel="Show only">
      {TAGS.map((t, i) => {
        const pressed = on.includes(t);
        return (
          <Paper
            key={t}
            onPress={() => { tap(); onChange(pressed ? on.filter((x) => x !== t) : [...on, t]); }}
            fill={pressed ? (light ? colors.paper : colors.sage) : undefined}
            edge={light && !pressed ? 'light' : 'ink'}
            edgeWidth={1.3}
            shape={i + 1}
            round={1.2}
            accessibilityState={{ selected: pressed }}
            accessibilityLabel={`${t}s only`}
            style={{ height: 34, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Icon name={TAG_ICON[t]} size={14} strokeWidth={1.8} color={pressed ? colors.ink : ink} />
            <Mono size={11.5} color={pressed ? colors.ink : ink}>{t}</Mono>
          </Paper>
        );
      })}
    </View>
  );
}

/** The asks tab, on Home or a profile: filters, then the tickets. `asks` gets the filters that are on. */
export function AskList({ asks, empty, light }: { asks: (only: ItemTag[]) => Ask[]; empty: { title: string; body: string }; light?: boolean }) {
  const [only, setOnly] = useState<ItemTag[]>([]);
  const rows = asks(only);
  const any = only.length ? asks([]).length > 0 : rows.length > 0;
  return (
    <View style={{ gap: 18 }}>
      {any ? <Filters on={only} onChange={setOnly} light={light} /> : null}
      {rows.length ? (
        <View style={{ gap: 22 }}>{rows.map((r, i) => <AskRow key={r.item.id} {...r} index={i} />)}</View>
      ) : (
        <View style={{ paddingVertical: 44, alignItems: 'center', gap: 8 }}>
          <Hand size={22} color={light ? colors.paper : colors.ink}>{any ? 'none of those' : empty.title}</Hand>
          <Mono size={12} center color={light ? colors.onDarkSoft : colors.inkSoft} style={{ maxWidth: 260, lineHeight: 18 }}>
            {any ? 'try another filter.' : empty.body}
          </Mono>
        </View>
      )}
    </View>
  );
}
