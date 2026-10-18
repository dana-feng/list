// Search across people, lists and items. Everything you're allowed to see is already synced to
// the phone (the database's visibility rules decide what comes down), so this only filters what's
// here: nothing you can't open will ever show up.
import { db, Item, List, Profile } from './db';
import { canViewList, isMember } from './lists';
import { tagsToNames } from './mentions';
import { searchPeople } from './profiles';

/** Lowercase, accents dropped, @ trimmed: what both sides are compared as. */
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** 0 when `text` starts with the term, 1 when a word in it does, 2 anywhere else; null if it's not there. */
function rank(text: string, term: string): number | null {
  const t = fold(text);
  const at = t.indexOf(term);
  if (at < 0) return null;
  if (at === 0) return 0;
  return /[\s\-_/·,.]/.test(t[at - 1]) ? 1 : 2;
}

export type SearchResults = { people: Profile[]; lists: List[]; items: Item[] };

export function search(q: string): SearchResults {
  const term = fold(q).replace(/^@/, '');
  if (!term) return { people: [], lists: [], items: [] };

  // yours first, then the best match, then a-z
  const lists = db.lists
    .filter((l) => canViewList(l.id))
    .map((list) => ({ list, r: rank(list.title, term) }))
    .filter((x): x is { list: List; r: number } => x.r !== null)
    .sort((a, b) => Number(isMember(b.list.id)) - Number(isMember(a.list.id)) || a.r - b.r || a.list.title.localeCompare(b.list.title))
    .map((x) => x.list);

  // a match in the title beats one in the notes; still to do before done
  const items = db.items
    .filter((i) => canViewList(i.list_id))
    .map((item) => {
      const title = rank(item.title, term);
      const notes = item.notes ? rank(tagsToNames(item.notes).text, term) : null;
      return { item, r: title ?? (notes === null ? null : 3 + notes) };
    })
    .filter((x): x is { item: Item; r: number } => x.r !== null)
    .sort((a, b) => Number(!!a.item.done_at) - Number(!!b.item.done_at) || a.r - b.r || a.item.title.localeCompare(b.item.title))
    .map((x) => x.item);

  return { people: searchPeople(q), lists, items };
}
