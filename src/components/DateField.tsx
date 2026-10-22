import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { longDay, monthYear, parseDay, toDay } from '@/lib';
import { colors } from '@/theme';
import { LinkText, Pill } from './Button';
import { Icon } from './Icon';
import { Paper } from './Paper';
import { Hand, Mono, MonoMedium } from './Text';
import { Surface } from './Surface';

const WEEKDAYS = ['s', 'm', 't', 'w', 't', 'f', 's'];
const monthOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

/** The due date as a cream chip with a calendar icon: "due Fri, Oct 17". */
export function DateChip({ value }: { value: string }) {
  return (
    <Paper fill={colors.cream} shape={2} round={1.3} style={styles.chip}>
      <Icon name="calendar" size={14} strokeWidth={1.8} />
      <MonoMedium size={12}>due {longDay(value)}</MonoMedium>
    </Paper>
  );
}

/** A chip that opens a month calendar under it, with "clear" and "done". Dashed until there's a date, then solid. */
export function DateField({ value, onChange, beside }: { value: string | null; onChange: (v: string | null) => void; beside?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthOf(new Date()));
  const today = toDay(new Date());
  const toggle = () => {
    // open on the picked date's month, unless that's already behind us
    if (!open) setMonth(monthOf(value && value > today ? parseDay(value) : new Date()));
    setOpen(!open);
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
    <View style={{ gap: 10 }}>
      {/* other chips can sit on the same line (the item's invite); the calendar still opens under them all */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Paper onPress={toggle} fill={colors.cream} edge={value ? 'ink' : 'dash'} edgeWidth={1.3} shape={2} round={1.3} style={[styles.chip, { height: 36 }]} accessibilityState={{ expanded: open }} accessibilityLabel={value ? `Due ${longDay(value)}. Change` : 'Add a due date'}>
          <Icon name="calendar" size={14} strokeWidth={1.8} />
          <MonoMedium size={12}>{value ? `due ${longDay(value)}` : 'due date'}</MonoMedium>
        </Paper>
        {beside}
      </View>
      {open ? (
        <Paper fill={colors.cream} edge="ink" edgeWidth={1.3} shape={4} style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6, gap: 6 }}>
          <View style={styles.head}>
            <Pressable onPress={() => step(-1)} disabled={!canGoBack} style={[styles.arrow, { opacity: canGoBack ? 1 : 0.25 }]} accessibilityRole="button" accessibilityLabel="Previous month">
              <Icon name="back" size={16} strokeWidth={2.2} />
            </Pressable>
            <Hand size={15}>{monthYear(month).replace(/^(\w+)/, (m) => FULL[m] ?? m)}</Hand>
            <Pressable onPress={() => step(1)} style={styles.arrow} accessibilityRole="button" accessibilityLabel="Next month">
              <Icon name="right" size={16} strokeWidth={2.2} />
            </Pressable>
          </View>
          <View style={styles.week}>
            {WEEKDAYS.map((d, i) => (
              <View key={i} style={[styles.cell, { height: 18 }]}><Mono size={10} color={colors.inkSoft}>{d}</Mono></View>
            ))}
          </View>
          {weeks.map((week, w) => (
            <View key={w} style={styles.week}>
              {week.map((day, i) => {
                if (!day) return <View key={i} style={styles.cell} />;
                const on = day === value;
                const past = day < today;
                return (
                  <Pressable key={day} style={styles.cell} onPress={() => onChange(day)} disabled={past} accessibilityRole="button" accessibilityLabel={longDay(day)} accessibilityState={{ selected: on, disabled: past }}>
                    <View style={[styles.day, on && { backgroundColor: colors.bark }, day === today && !on && styles.today]}>
                      <Surface tone={on ? 'dark' : 'light'}><Mono size={11} color={on ? colors.paper : colors.ink} style={{ opacity: past ? 0.35 : 1 }}>{parseDay(day).getDate()}</Mono></Surface>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <LinkText label="clear" size={11.5} onPress={() => { onChange(null); setOpen(false); }} />
            <Pill label="done" onPress={() => setOpen(false)} />
          </View>
        </Paper>
      ) : null}
    </View>
  );
}

const FULL: Record<string, string> = {
  jan: 'january', feb: 'february', mar: 'march', apr: 'april', may: 'may', jun: 'june',
  jul: 'july', aug: 'august', sep: 'september', oct: 'october', nov: 'november', dec: 'december',
};

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center' },
  day: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.3, borderStyle: 'dashed', borderColor: colors.ink },
});
