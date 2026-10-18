import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { peopleToTag, tagBeingTyped, textParts } from '@/api/mentions';
import { NOTES_MAX } from '@/limits';
import { colors, fonts, noOutline } from '@/theme';
import { Avatar } from './Avatar';
import { Paper } from './Paper';
import { openProfile } from './PersonRow';
import { useReveal } from './Screen';
import { CharsLeft, Hand, Mono } from './Text';

type Props = {
  value: string;
  onChange?: (v: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  /** When the field goes away (leaving the screen) while you're still typing: there's no blur then. */
  onLeave?: () => void;
  editing?: boolean;
  placeholder?: string;
  /** People on this list come first when you type @. */
  listId?: string | null;
};

/**
 * Notes on a cream sheet. A dashed sheet you can type on while editing; type @ there to tag someone.
 * Reading, `value` is the saved text (tags as ids). Editing, it's the typed text (tags as @username).
 * While you type, the screen scrolls so the whole sheet stays above the keyboard as it grows.
 */
export function NotesField({ value, onChange, onBlur, onFocus, onLeave, editing, placeholder, listId }: Props) {
  const [cursor, setCursor] = useState(value.length);
  // where to put the cursor after a tag is dropped in; handed to the field once, then let go
  const [moveTo, setMoveTo] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const box = useRef<View>(null);
  const reveal = useReveal();
  // the keyboard coming up shrinks the screen: scroll once it has
  useEffect(() => {
    if (!focused) return;
    const sub = Keyboard.addListener('keyboardDidShow', () => reveal(box.current));
    return () => sub.remove();
  }, [focused, reveal]);

  // leaving the screen mid-sentence: hand over what's typed, since onBlur won't come
  const latest = useRef(onLeave);
  const typingNow = useRef(false);
  useEffect(() => {
    latest.current = onLeave;
    typingNow.current = focused;
  });
  useEffect(() => () => {
    if (typingNow.current) latest.current?.();
  }, []);

  if (!editing) {
    return (
      <Paper fill={colors.cream} shape={3} lean={1} style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
        {value ? (
          <Hand size={16} style={{ lineHeight: 23 }}>
            {textParts(value).map((part, i) =>
              part.person ? (
                <Text key={i} onPress={() => openProfile(part.person!)} accessibilityRole="link" accessibilityLabel={`${part.person.name}, ${part.text}`} style={{ textDecorationLine: 'underline' }}>
                  {part.text}
                </Text>
              ) : (
                part.text
              ),
            )}
          </Hand>
        ) : (
          <Mono size={12} color={colors.inkFaint}>no notes yet</Mono>
        )}
      </Paper>
    );
  }

  const typing = tagBeingTyped(value, Math.min(cursor, value.length));
  const people = typing ? peopleToTag(typing.query, listId) : [];
  const tag = (username: string) => {
    if (!typing) return;
    const before = `${value.slice(0, typing.start)}@${username} `;
    // don't leave two spaces when the tag lands in front of one
    onChange?.(before + value.slice(Math.min(cursor, value.length)).replace(/^ /, ''));
    setCursor(before.length);
    setMoveTo(before.length);
  };

  return (
    // a new line or the people to tag growing the sheet: keep all of it in view
    <View ref={box} collapsable={false} onLayout={() => { if (focused) reveal(box.current); }}>
      <Paper fill={colors.cream} edge="dash" edgeWidth={1.3} shape={3} lean={1} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          selection={moveTo === null ? undefined : { start: moveTo, end: moveTo }}
          onSelectionChange={(e) => {
            setCursor(e.nativeEvent.selection.end);
            setMoveTo(null);
          }}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
            // already up (moving from the title): no keyboardDidShow, so look now
            setTimeout(() => reveal(box.current), 50);
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          maxLength={NOTES_MAX}
          multiline
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Notes"
          textAlignVertical="top"
          style={[{ fontFamily: fonts.hand, fontSize: 16, lineHeight: 23, color: colors.ink, minHeight: 92, padding: 0 }, noOutline]}
        />
        <CharsLeft value={value} max={NOTES_MAX} />
        {people.length ? (
          <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: 4 }}>
            {people.map((p) => (
              <Pressable key={p.id} onPress={() => tag(p.username)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }} accessibilityRole="button" accessibilityLabel={`Tag ${p.name}, @${p.username}`}>
                <Avatar person={p} size={28} />
                <Hand size={16}>{p.name}</Hand>
                <Mono size={10.5} color={colors.inkSoft}>@{p.username}</Mono>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Paper>
    </View>
  );
}
