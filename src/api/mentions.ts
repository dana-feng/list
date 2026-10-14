// Tagging people with "@username". You type and read @username; what's saved is the person's id
// and their username at the time, as <@id|username>. The id makes a tag follow someone through a
// username change. The username is what's shown, as plain text, once they can't be found (a
// deleted account, or later a block), so a raw id is never shown. Only items' notes for now.
// Comments will use the same pieces, and notifications can read the ids out of the saved text.
import { db, Profile } from './db';
import { listPeople } from './lists';
import { getProfile, getProfileByUsername, isFollowing } from './profiles';

// An @ that starts a word (so not the one in an email address), then username characters.
const TYPED = /(^|[^a-z0-9._@<|])@([a-z0-9._]+)/gi;
const TYPING = /(?:^|[^a-z0-9._@<|])@([a-z0-9._]{0,20})$/i;
const SAVED = /<@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\|([a-z0-9._]+))?>/gi;

/** People in the note you can't find (deleted, or later blocked): username as saved -> their id. */
export type Unfound = Record<string, string>;

/** "@dana." at the end of a sentence means dana: drop trailing dots until it's a username we know.
 *  Someone already tagged in this note who can't be found keeps their tag. */
function whoIs(handle: string, unfound: Unfound) {
  let h = handle.toLowerCase();
  for (;;) {
    const id = unfound[h];
    if (id) return { id, username: h };
    const person = getProfileByUsername(h);
    if (person || !/[._]$/.test(h)) return person;
    h = h.slice(0, -1);
  }
}

/** Saved text to something you can edit: each tag becomes @ and their username, today's if they
 *  can be found, otherwise the one saved with the tag. `unfound` goes back to tagsToIds on save. */
export function tagsToNames(text: string) {
  const unfound: Unfound = {};
  const names = text.replace(SAVED, (whole, id: string, saved?: string) => {
    const person = getProfile(id.toLowerCase());
    if (person) return `@${person.username}`;
    if (!saved) return '@someone';
    unfound[saved.toLowerCase()] = id;
    return `@${saved}`;
  });
  return { text: names, unfound };
}

/** Typed text to saved text: every @username that is someone becomes <@their id|username>. */
export const tagsToIds = (text: string, unfound: Unfound = {}) =>
  text.replace(TYPED, (whole, before: string, handle: string) => {
    const person = whoIs(handle, unfound);
    return person ? `${before}<@${person.id}|${person.username}>${handle.slice(person.username.length)}` : whole;
  });

/** person: a tag to open. gone: a tag on someone who can't be found, drawn faded so it doesn't
 *  read as whoever has that username now. */
export type TextPart = { text: string; person?: Profile; gone?: boolean };

/** Saved text cut up for display: plain stretches, and tags carrying the person to open. Someone
 *  who can't be found shows as their saved @username, faded, and you can't tap it. */
export function textParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let at = 0;
  for (const m of text.matchAll(SAVED)) {
    const person = getProfile(m[1].toLowerCase());
    parts.push({ text: text.slice(at, m.index) }, person ? { text: `@${person.username}`, person } : { text: `@${m[2] ?? 'someone'}`, gone: true });
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
