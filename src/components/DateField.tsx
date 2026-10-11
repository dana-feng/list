import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { dayParts, longDay, toDay } from '@/lib';
import { colors, space } from '@/theme';
import { Icon } from './Icon';
import { Mono, Serif } from './Text';

/** Date shown as a gold chip, or picked from a strip of the next few weeks. */
export function DateField({ value, onChange, editing }: { value: string | null; onChange?: (v: string | null) => void; editing?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!editing) {
    if (!value) return null;
    return (
      <View style={[styles.chip, { backgroundColor: colors.gold }]}>
        <Icon name="calendar" size={14} />
        <Mono size={13}>{longDay(value)}</Mono>
      </View>
    );
  }
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return toDay(d);
  });
  return (
    <View>
      <Pressable onPress={() => setOpen(!open)} style={[styles.chip, styles.dashed, value ? { backgroundColor: colors.goldSoft } : null]} accessibilityRole="button">
        <Icon name="calendar" size={14} />
        <Mono size={13}>{value ? `${longDay(value)} · change` : '+ date'}</Mono>
      </Pressable>
      {open ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.md, marginHorizontal: -space.lg }} contentContainerStyle={{ gap: 6, paddingHorizontal: space.lg }}>
          {value ? (
            <Pressable style={[styles.day, styles.dashed]} onPress={() => { onChange?.(null); setOpen(false); }} accessibilityLabel="No date">
              <Mono size={10.5}>NO</Mono>
              <Mono size={10.5}>DATE</Mono>
            </Pressable>
          ) : null}
          {days.map((day) => {
            const { weekday, day: n } = dayParts(day);
            const on = day === value;
            return (
              <Pressable key={day} style={[styles.day, { backgroundColor: on ? colors.gold : colors.paper }]} onPress={() => { onChange?.(day); setOpen(false); }} accessibilityLabel={longDay(day)}>
                <Mono size={10.5}>{weekday}</Mono>
                <Serif size={19} style={{ lineHeight: 22 }}>{n}</Serif>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, height: 30, borderRadius: 9 },
  dashed: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#8A7430' },
  day: { width: 46, height: 52, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
