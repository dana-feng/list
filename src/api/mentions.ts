// Tagging people with "@username". You type and read @username; what's saved is the person's
// id, as <@id>, so a tag follows them through a username change. Only items' notes for now.
// Comments will use the same pieces, and notifications can read the ids out of the saved text.
import { db, Profile } from './db';
import { listPeople } from './lists';
import { getProfile, getProfileByUsername, isFollowing } from './profiles';

// An @ that starts a word (so not the one in an email address), then username characters.
const TYPED = /(^|[^a-z0-9._@<])@([a-z0-9._]+)/gi;
const TYPING = /(?:^|[^a-z0-9._@<])@([a-z0-9._]{0,20})$/i;
const SAVED = /<@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})>/gi;

/** "@dana." at the end of a sentence means dana: drop trailing dots until it's someone's username. */
function whoIs(handle: string) {
  let h = handle.toLowerCase();
  for (;;) {
    const person = getProfileByUsername(h);
    if (person || !/[._]$/.test(h)) return person;
    h = h.slice(0, -1);
  }
}

// A tag on someone you can't see (a block, a deleted account) reads "@(someone)" while editing, or
// "@(someone 2)" for a second such person. The brackets can't be in a username, so it never turns
// into someone else's tag; on save it goes back to the id it stood for. The raw id is never shown.
const someone = (n: number) => (n === 0 ? '@(someone)' : `@(someone ${n + 1})`);
const SOMEONE = /@\(someone(?: (\d+))?\)/g;

/** Saved text to something you can edit: <@id> becomes @ and their username as it is today.
 *  `hidden` is the ids behind any "@(someone)", to hand back to tagsToIds. */
export function tagsToNames(text: string) {
  const hidden: string[] = [];
  const names = text.replace(SAVED, (_, id: string) => {
    const person = getProfile(id.toLowerCase());
    if (person) return `@${person.username}`;
    if (!hidden.includes(id)) hidden.push(id);
    return someone(hidden.indexOf(id));
  });
  return { text: names, hidden };
}

/** Typed text to saved text: every @username that is someone becomes <@their id>, and every
 *  "@(someone)" left in goes back to the id it stood for. */
export const tagsToIds = (text: string, hidden: string[] = []) =>
  text
    .replace(SOMEONE, (whole, n?: string) => {
      const id = hidden[n ? Number(n) - 1 : 0];
      return id ? `<@${id}>` : whole;
    })
    .replace(TYPED, (whole, before: string, handle: string) => {
      const person = whoIs(handle);
      return person ? `${before}<@${person.id}>${handle.slice(person.username.length)}` : whole;
    });

export type TextPart = { text: string; person?: Profile };

/** Saved text cut up for display: plain stretches, and tags carrying the person to open. */
export function textParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let at = 0;
  for (const m of text.matchAll(SAVED)) {
    const person = getProfile(m[1].toLowerCase());
    parts.push({ text: text.slice(at, m.index) }, person ? { text: `@${person.username}`, person } : { text: '@someone' });
    at = m.index + m[0].length;
  }
  parts.push({ text: text.slice(at) });
  return parts.filter((p) => p.text);
}

/** The "@da" being typed just before the cursor, if there is one. `start` is where its @ sits. */
export function tagBeingTyped(text: string, cursor: number) {
  const m = TYPING.exec(text.slice(0, cursor));
  return m ? { start: cursor - m[1].length - 1, query: m[1].toLowerCase() } : null;
}

/** Who to offer while someone types a tag: you and the people on the list first, then people you follow or who follow you. */
export function peopleToTag(query: string, listId?: string | null, max = 5): Profile[] {
  const onList = listId ? listPeople(listId).map((p) => p.id) : [];
  const rank = (p: Profile) => (p.id === db.me || onList.includes(p.id) ? 0 : isFollowing(p.id) || isFollowing(db.me, p.id) ? 1 : 2);
  return db.profiles
    .filter((p) => rank(p) < 2 && (p.username.startsWith(query) || p.name.toLowerCase().startsWith(query)))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .slice(0, max);
}
