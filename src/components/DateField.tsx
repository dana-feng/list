import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { longDay, monthYear, parseDay, toDay } from '@/lib';
import { colors, space } from '@/theme';
import { Icon } from './Icon';
import { Mono, SansBold, Serif } from './Text';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const monthOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

/** Date shown as a gold chip, or picked from a month calendar that drops down under it. */
export function DateField({ value, onChange, editing }: { value: string | null; onChange?: (v: string | null) => void; editing?: boolean }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthOf(new Date()));
  if (!editing) {
    if (!value) return null;
    return (
      <View style={[styles.chip, { backgroundColor: colors.gold }]}>
        <Icon name="calendar" size={14} />
        <Mono size={13}>{longDay(value)}</Mono>
      </View>
    );
  }
  const today = toDay(new Date());
  const toggle = () => {
    // open on the month of the picked date, unless that's already behind us
    if (!open) setMonth(monthOf(value && value > today ? parseDay(value) : new Date()));
    setOpen(!open);
  };
  const pick = (day: string | null) => {
    onChange?.(day);
    setOpen(false);
  };
  const step = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));
  const canGoBack = month > monthOf(new Date());

  // blank cells before the 1st and after the last day, so every week is a full row
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: month.getDay() }, () => null),
    ...Array.from({ length: count }, (_, i) => toDay(new Date(month.getFullYear(), month.getMonth(), i + 1))),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  return (
    <View>
      <Pressable onPress={toggle} style={[styles.chip, styles.dashed, value ? { backgroundColor: colors.goldSoft } : null]} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Icon name="calendar" size={14} />
        <Mono size={13}>{value ? `${longDay(value)} · change` : '+ date'}</Mono>
      </Pressable>
      {open ? (
        <View style={styles.calendar}>
          <View style={styles.head}>
            <Pressable onPress={() => step(-1)} disabled={!canGoBack} hitSlop={10} style={{ opacity: canGoBack ? 1 : 0.25 }} accessibilityRole="button" accessibilityLabel="Previous month">
              <Icon name="back" size={20} />
            </Pressable>
            <Serif size={18}>{monthYear(month)}</Serif>
            <Pressable onPress={() => step(1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Next month">
              <Icon name="right" size={20} />
            </Pressable>
          </View>
          <View style={styles.week}>
            {WEEKDAYS.map((d, i) => (
              <View key={i} style={styles.cell}>
                <Mono size={10.5} color={colors.inkFaint}>{d}</Mono>
              </View>
            ))}
          </View>
          {weeks.map((week, w) => (
            <View key={w} style={styles.week}>
              {week.map((day, i) => {
                if (!day) return <View key={i} style={styles.cell} />;
                const on = day === value;
                const past = day < today;
                return (
                  <Pressable key={day} style={styles.cell} onPress={() => pick(day)} disabled={past} accessibilityRole="button" accessibilityLabel={longDay(day)} accessibilityState={{ selected: on, disabled: past }}>
                    <View style={[styles.day, on && { backgroundColor: colors.gold }, day === today && !on && styles.today]}>
                      <Serif size={16} color={past ? colors.inkFaint : colors.ink} style={{ lineHeight: 20, opacity: past ? 0.5 : 1 }}>{parseDay(day).getDate()}</Serif>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
          {value ? (
            <Pressable onPress={() => pick(null)} hitSlop={8} style={{ alignSelf: 'center', marginTop: space.sm }} accessibilityRole="button">
              <SansBold size={14} color={colors.inkSoft}>No date</SansBold>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, height: 30, borderRadius: 9 },
  dashed: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#8A7430' },
  calendar: { marginTop: space.md, padding: space.md, borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.line },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xs, marginBottom: space.sm },
  week: { flexDirection: 'row' },
  cell: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.goldDeep },
});
