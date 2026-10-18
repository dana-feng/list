import { db, EventKind } from '@/api/db';
import { item, list, member, person, signIn } from '@/test/fixtures';
import { describePost } from './FeedPost';

const post = (actor: string, kind: EventKind, listId: string, itemId: string | null = null) => ({
  id: `e-${kind}`, actor_id: actor, kind, list_id: listId, item_id: itemId, created_at: '2026-10-05T00:00:00Z',
});

beforeEach(() => signIn());

describe('describePost', () => {
  it('a "did" names whoever crossed it off, not everyone on the list', () => {
    const [ada, bo] = [person(), person()];
    const l = list({ visibility: 'anyone' }, [ada, bo]);
    const i = item(l, { done_at: '2026-10-05T00:00:00Z' });
    expect(describePost(post(bo.id, 'item_done', l.id, i.id))?.people.map((p) => p.id)).toEqual([bo.id]);
  });

  it('"finished a list" still names everyone on it', () => {
    const [ada, bo] = [person(), person()];
    const l = list({ visibility: 'anyone' }, [ada, bo]);
    expect(describePost(post(ada.id, 'list_done', l.id))?.people.map((p) => p.id)).toEqual([ada.id, bo.id]);
  });

  it('a photos post shows only that person\'s photos, and counts them', () => {
    const [ada, bo] = [person(), person()];
    const l = list({ visibility: 'anyone' }, [ada]);
    member(l, bo.id);
    const i = item(l);
    const photo = (id: string, by: string) => ({ id, item_id: i.id, path: `${l.id}/${i.id}/${id}.jpg`, position: 0, added_by: by, created_at: '2026-10-05T00:00:00Z' });
    db.item_photos.push(photo('p1', ada.id), photo('p2', ada.id), photo('p3', bo.id));
    const p = describePost(post(ada.id, 'photos_added', l.id, i.id));
    expect(p?.photos.map((x) => x.id)).toEqual(['p1', 'p2']);
    expect(p?.verb).toBe('added 2 photos to');
  });

  it('a photos post goes away once their photos are gone', () => {
    const ada = person();
    const l = list({ visibility: 'anyone' }, [ada]);
    expect(describePost(post(ada.id, 'photos_added', l.id, item(l).id))).toBeNull();
  });

  it('a tagged post says what the tag asks for', () => {
    const ada = person();
    const l = list({ visibility: 'anyone' }, [ada]);
    expect(describePost(post(ada.id, 'item_tagged', l.id, item(l, { tag: 'borrow' }).id))?.verb).toBe('wants to borrow');
    expect(describePost(post(ada.id, 'item_tagged', l.id, item(l, { tag: null }).id))).toBeNull();
  });

  it('never shows open invites', () => {
    const ada = person();
    const l = list({ visibility: 'anyone' }, [ada]);
    expect(describePost(post(ada.id, 'open_invite', l.id, item(l).id))).toBeNull();
  });
});
