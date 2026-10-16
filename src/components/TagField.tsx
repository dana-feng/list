import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import type { ItemTag, Profile } from '@/api/db';
import { TagChoice } from '@/api/items';
import { getProfile } from '@/api/profiles';
import { colors } from '@/theme';
import { AvatarStack } from './Avatar';
import { LinkText } from './Button';
import { Icon, IconName } from './Icon';
import { InviteSheet, SheetFooter } from './InviteSheet';
import { Paper } from './Paper';
import { Sheet } from './Sheet';
import { Mono, MonoMedium } from './Text';
import { choiceIcon } from './VisibilityPicker';

export const TAG_ICON: Record<ItemTag, IconName> = { invite: 'invite', gift: 'gift', borrow: 'borrow' };

type Props = {
  value: TagChoice;
  onChange: (next: TagChoice) => void;
  /** gift: how many friends have already said they'll get. Once there are any it stays a gift. */
  claimed?: number;
  /** open invite: how many said they're interested */
  interested?: number;
};

/**
 * The tag on an item you're on. Dashed "+ tag" until there is one; tapping it opens a small menu:
 * invite, gift, borrow, clear. Invite and gift open a sheet for their settings; borrow has none.
 * Once set, the chip says the setting ("gift · 3", "2 invited") and tapping it reopens the sheet
 * (or the menu, for borrow).
 */
export function TagField({ value, onChange, claimed = 0, interested = 0 }: Props) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [sheet, setSheet] = useState<'invite' | 'gift' | null>(null);
  const anchor = useRef<View>(null);
  const frozen = value.tag === 'gift' && claimed > 0;

  const openMenu = () => anchor.current?.measureInWindow((x, y, _w, h) => setMenu({ x, y: y + h + 6 }));
  const pick = (tag: ItemTag | null) => {
    setMenu(null);
    if (tag === 'invite' || tag === 'gift') setSheet(tag);
    else onChange({ ...value, tag });
  };
  const tapChip = () => {
    if (value.tag === 'invite' || value.tag === 'gift') setSheet(value.tag);
    else openMenu();
  };

  return (
    <>
      <View ref={anchor} collapsable={false}>
        <TagChip value={value} interested={interested} onPress={tapChip} expanded={!!menu} />
      </View>

      {menu ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setMenu(null)}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(null)} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={[styles.menu, { left: Math.max(12, menu.x), top: menu.y }]} accessibilityRole="menu">
            {(['invite', 'gift', 'borrow'] as const).map((t) => {
              const on = value.tag === t;
              const off = frozen && t !== 'gift';
              return (
                <Pressable
                  key={t}
                  onPress={() => pick(t)}
                  disabled={off}
                  style={[styles.option, on && { backgroundColor: colors.sage }, off && { opacity: 0.35 }]}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: on, disabled: off }}
                >
                  <Icon name={TAG_ICON[t]} size={15} strokeWidth={1.7} />
                  <MonoMedium size={12}>{t}</MonoMedium>
                </Pressable>
              );
            })}
            <View style={styles.rule}>
              {frozen ? (
                <Mono size={10.5} color={colors.inkSoft} style={{ paddingVertical: 10, paddingHorizontal: 4, lineHeight: 15 }}>someone’s getting this, so it stays a gift</Mono>
              ) : (
                <LinkText label="clear" size={11.5} onPress={() => pick(null)} />
              )}
            </View>
          </View>
        </Modal>
      ) : null}

      {sheet === 'invite' ? (
        <InviteSheet
          audience={value.tag === 'invite' ? value.audience : 'followers'}
          invitees={value.invitees}
          onDone={(audience, invitees) => { setSheet(null); onChange({ ...value, tag: 'invite', audience, invitees }); }}
          onClear={() => { setSheet(null); onChange({ ...value, tag: null }); }}
        />
      ) : null}
      {sheet === 'gift' ? (
        <GiftSheet
          quantity={value.tag === 'gift' ? value.quantity : 1}
          claimed={claimed}
          onDone={(quantity) => { setSheet(null); onChange({ ...value, tag: 'gift', quantity }); }}
          onClear={() => { setSheet(null); onChange({ ...value, tag: null }); }}
        />
      ) : null}
    </>
  );
}

/** The chip itself: dashed "+ tag", or what the tag is set to. */
function TagChip({ value, interested, onPress, expanded }: { value: TagChoice; interested: number; onPress: () => void; expanded: boolean }) {
  if (!value.tag) {
    return (
      <Paper onPress={onPress} fill={colors.cream} edge="dash" edgeWidth={1.3} shape={3} round={1.3} style={[chip, { gap: 5 }]} accessibilityLabel="Add a tag: invite, gift or borrow" accessibilityState={{ expanded }}>
        <Icon name="plus" size={12} strokeWidth={2.4} />
        <MonoMedium size={12}>tag</MonoMedium>
      </Paper>
    );
  }
  if (value.tag === 'invite') {
    const picked = value.invitees.map((id) => getProfile(id)).filter((p): p is Profile => !!p);
    const who = value.audience === 'specific' ? `${picked.length} invited` : value.audience === 'anyone' ? 'anyone invited' : 'followers invited';
    const label = interested ? `${who} · ${interested} interested` : who;
    return (
      <Paper onPress={onPress} fill={colors.cream} edge="ink" edgeWidth={1.3} shape={3} round={1.3} style={[chip, picked.length ? { paddingLeft: 5 } : null]} accessibilityLabel={`${label}. Change who's invited`}>
        {value.audience === 'specific' && picked.length ? <AvatarStack people={picked} size={24} max={3} /> : <Icon name={choiceIcon(value.audience)} size={15} strokeWidth={1.8} />}
        <MonoMedium size={12}>{label}</MonoMedium>
      </Paper>
    );
  }
  const label = value.tag === 'gift' ? `gift · ${value.quantity}` : 'borrow';
  return (
    <Paper onPress={onPress} fill={colors.cream} edge="ink" edgeWidth={1.3} shape={3} round={1.3} style={chip} accessibilityLabel={`${label}. Change`} accessibilityState={{ expanded }}>
      <Icon name={TAG_ICON[value.tag]} size={15} strokeWidth={1.8} />
      <MonoMedium size={12}>{label}</MonoMedium>
    </Paper>
  );
}

/** On someone else's item: just what it is ("gift", "borrow"), not its settings. */
export function TagBadge({ tag }: { tag: ItemTag }) {
  return (
    <Paper fill={colors.cream} edge="ink" edgeWidth={1.3} shape={3} round={1.3} style={chip}>
      <Icon name={TAG_ICON[tag]} size={15} strokeWidth={1.8} />
      <MonoMedium size={12}>{tag}</MonoMedium>
    </Paper>
  );
}

/** A gift's one setting: how many. Can't go below what friends have already claimed. */
function GiftSheet({ quantity, claimed, onDone, onClear }: { quantity: number; claimed: number; onDone: (n: number) => void; onClear: () => void }) {
  const [n, setN] = useState(Math.max(quantity, claimed, 1));
  const min = Math.max(1, claimed);
  return (
    <Sheet
      onClose={() => onDone(n)}
      footer={<SheetFooter onDone={() => onDone(n)} onClear={claimed ? undefined : onClear} clearNote={claimed ? `${claimed} already claimed, so it stays a gift and can’t be fewer than that.` : undefined} />}
    >
      <View style={[styles.row, { borderColor: colors.ink }]}>
        <Mono size={14} style={{ flex: 1 }}>how many</Mono>
        <Stepper value={n} min={min} max={99} onChange={setN} />
      </View>
    </Sheet>
  );
}

/** – n + */
export function Stepper({ value, min, max, onChange, big }: { value: number; min: number; max: number; onChange: (n: number) => void; big?: boolean }) {
  const h = big ? 52 : 40;
  return (
    <Paper fill={big ? undefined : colors.cream} edge="ink" edgeWidth={big ? 1.5 : 1.3} shape={big ? 4 : 2} style={{ height: h, flexDirection: 'row', alignItems: 'center' }}>
      <Pressable onPress={() => onChange(value - 1)} disabled={value <= min} style={[styles.step, { height: h - 2, opacity: value <= min ? 0.3 : 1 }]} accessibilityRole="button" accessibilityLabel="One fewer">
        <Mono size={17}>–</Mono>
      </Pressable>
      {big ? <MonoMedium size={18} style={{ minWidth: 22, textAlign: 'center' }}>{value}</MonoMedium> : <MonoMedium size={14} style={{ minWidth: 20, textAlign: 'center' }}>{value}</MonoMedium>}
      <Pressable onPress={() => onChange(value + 1)} disabled={value >= max} style={[styles.step, { height: h - 2, opacity: value >= max ? 0.3 : 1 }]} accessibilityRole="button" accessibilityLabel="One more">
        <Mono size={17}>+</Mono>
      </Pressable>
    </Paper>
  );
}

const chip = { alignSelf: 'flex-start' as const, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7, height: 36, paddingHorizontal: 11 };

const styles = StyleSheet.create({
  menu: {
    position: 'absolute', width: 168, padding: 6, backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.ink,
    borderTopLeftRadius: 9, borderTopRightRadius: 6, borderBottomRightRadius: 11, borderBottomLeftRadius: 8,
    boxShadow: '0 8px 9px rgba(58,16,0,0.25)',
  },
  option: { minHeight: 44, paddingHorizontal: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rule: { borderTopWidth: 1, borderTopColor: colors.inkTrack, marginTop: 4, paddingHorizontal: 4 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingRight: 8, borderWidth: 1.5, borderTopLeftRadius: 9, borderTopRightRadius: 6, borderBottomRightRadius: 10, borderBottomLeftRadius: 5 },
  step: { width: 44, alignItems: 'center', justifyContent: 'center' },
});
