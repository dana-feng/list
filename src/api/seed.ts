// Fake people, lists and items for the mock. Mirrors what supabase/seed.sql will hold.
import type { Db, Item, ItemPhoto, List, ListMember, Profile, Visibility } from './db';

const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

const KAYAK_NOTES = [
  'rentals open at 5, book two kayaks (the double ones are first come first serve)',
  'meet at Pier 26, by the bike rack, 4:30 so we’re early',
  'bring a light jacket, it gets cold on the water after sunset',
  'water bottle + sunscreen even though it’s october',
  'they make you sign a waiver, bring an ID',
  'phones go in the dry bags they give you, or leave them in the locker',
  'after: tacos at the place on Hudson & Laight? adanna says the line moves fast',
  'backup if it rains: same plan, next saturday, same time',
  'if it’s windy they close the river, check their instagram that morning',
  'cost is free!! but tip the volunteers',
  'last time adanna went they paddled out to see the statue of liberty lit up, ask about the longer route',
  'things to try: get a photo from the water looking back at the skyline',
  'also: remember to pick up the film camera from the shop before',
].join('\n');

export function seed(): Db {
  const p = (id: string, username: string, bg: string, fg: string, extra: Partial<Profile> = {}): Profile => ({
    id, username, name: id, avatar_path: null, tint: { bg, fg }, ...extra,
  });
  const profiles: Profile[] = [
    p('dana', 'dana', '#E8C390', '#A06A32', { base_followers: 54, base_following: 53 }),
    p('adanna', 'adanna', '#B7C7A0', '#5D7345', { base_followers: 80, base_following: 71 }),
    p('michelle', 'michelle.k', '#EBAE94', '#A0503A', { base_followers: 44, base_following: 60 }),
    p('irina', 'irina', '#AFBFD6', '#4E6485', { base_followers: 209, base_following: 95 }),
    p('mengrou', 'mengrou', '#EAD58E', '#A07C28', { base_followers: 30, base_following: 41 }),
    p('jordan', 'jordanp', '#D9C49C', '#7D6540', { base_followers: 120, base_following: 88 }),
    p('priya', 'priya.s', '#C7B0D8', '#6D5488', { base_followers: 65, base_following: 52 }),
    p('sam', 'samwise', '#B5D0C8', '#4F7868', { base_followers: 18, base_following: 33 }),
    p('leo', 'leo.m', '#E3B5A6', '#8A4F40', { base_followers: 25, base_following: 40 }),
    p('ana', 'ana.b', '#CFA8B8', '#7D4A60', { base_followers: 37, base_following: 29 }),
    p('mika', 'mika.t', '#E5B8AC', '#8F5448', { base_followers: 12, base_following: 20 }),
    p('milo', 'milo.r', '#D8DFC0', '#5D7345', { base_followers: 9, base_following: 14 }),
  ];

  const follow = (a: string, b: string) => ({ follower_id: a, followee_id: b, created_at: ago(500) });
  const follows = [
    ...['adanna', 'michelle', 'irina', 'jordan', 'priya'].map((u) => follow('dana', u)),
    ...['adanna', 'michelle', 'irina', 'mengrou', 'jordan', 'priya', 'sam', 'leo', 'ana'].map((u) => follow(u, 'dana')),
    follow('michelle', 'irina'), follow('mengrou', 'irina'),
  ];

  const lists: List[] = [];
  const list_members: ListMember[] = [];
  const items: Item[] = [];
  const item_photos: ItemPhoto[] = [];

  type SeedItem = Partial<Item> & { title: string; photos?: number; done?: number };
  function list(id: string, title: string, owner: string, visibility: Visibility, members: string[], things: SeedItem[], invited: string[] = []) {
    const allDone = things.every((t) => t.done != null);
    lists.push({ id, owner_id: owner, title, visibility, completed_at: allDone ? ago(Math.min(...things.map((t) => t.done!))) : null, created_at: ago(900) });
    list_members.push({ list_id: id, user_id: owner, role: 'owner', status: 'joined' });
    members.forEach((u) => list_members.push({ list_id: id, user_id: u, role: 'member', status: 'joined' }));
    invited.forEach((u) => list_members.push({ list_id: id, user_id: u, role: 'member', status: 'invited' }));
    things.forEach((t, i) => {
      const itemId = `${id}_${i + 1}`;
      const { photos = 0, done, ...rest } = t;
      items.push({
        id: itemId, list_id: id, notes: '', date: null, asking: false, asked_at: null,
        done_at: done != null ? ago(done) : null, done_by: done != null ? owner : null, position: i, ...rest,
      });
      for (let k = 0; k < photos; k++) item_photos.push({ id: `${itemId}_p${k}`, item_id: itemId, path: null, position: k, added_by: owner });
    });
  }

  const d = 24;
  list('nyc', 'new york bucket list', 'dana', 'followers', ['adanna'], [
    { title: 'Sunset kayak on the Hudson', date: '2026-10-17', asking: true, asked_at: ago(30), notes: KAYAK_NOTES, photos: 3 },
    { title: 'Walk the High Line' },
    { title: 'Staten Island ferry at night', asking: true, asked_at: ago(60) },
    { title: 'Dinner in Chinatown' },
    { title: 'Ballet at Lincoln Center', done: 8 * d, photos: 2 },
    { title: 'Brooklyn Bridge at sunrise', done: 10 * d, photos: 1 },
    { title: 'Sunset on Little Island', done: 15 * d, photos: 1 },
    { title: 'Dumpling crawl in Flushing', done: 30 * d, photos: 1 },
    { title: 'Coney Island boardwalk', done: 70 * d, photos: 1 },
  ]);
  list('eats', 'brooklyn eats', 'dana', 'followers', ['michelle', 'irina'], [
    { title: 'Tacos in Bushwick' },
    { title: 'Natural wine bar in Bed-Stuy' },
    { title: 'Ice cream in Greenpoint' },
    { title: 'Pizza in Carroll Gardens', done: 12 * d, photos: 1 },
    { title: 'Bagels in Williamsburg', done: 20 * d },
    { title: 'Dim sum in Sunset Park', done: 33 * d, photos: 1 },
  ]);
  list('bday', 'birthday week', 'dana', 'specific', [], [
    { title: 'Wheel-throwing class' },
    { title: 'Karaoke night', date: '2026-10-30' },
    { title: 'Bake a cake' },
    { title: 'Picnic brunch' },
    { title: 'Omakase dinner', done: 5 * d },
  ]);
  list('summer', 'summer in the city', 'dana', 'followers', ['adanna'], [
    { title: 'Picnic at McCarren Park', done: 26, photos: 1 },
    { title: 'Rooftop movie night', done: 40 * d },
    { title: 'Governors Island bikes', done: 50 * d, photos: 1 },
    { title: 'Swim at Rockaway', done: 52 * d, photos: 1 },
  ]);
  list('reading', 'fall reading', 'dana', 'followers', [], [
    'A classic I skipped in school', 'A short story collection', 'A book in translation', 'A memoir',
    'Poetry, one book', 'A mystery', 'Something a friend loves', 'A re-read',
  ].map((title) => ({ title })));
  list('weekends', 'summer weekends', 'adanna', 'followers', [], [
    { title: 'Beach day at Fort Tilden' },
    { title: 'Outdoor concert in Prospect Park' },
    { title: 'Ferry to Governors Island' },
    { title: 'Night market in Queens' },
    { title: 'Hike at Bear Mountain' },
  ], ['dana']);
  list('fall', 'fall in the city', 'irina', 'followers', [], [
    { title: 'Sunset kayak on the Hudson', date: '2026-10-17', asking: true, asked_at: ago(2), notes: 'rentals open at 5, book two kayaks', photos: 3 },
    { title: 'Apple picking upstate' },
    { title: 'Fall foliage at Wave Hill', asking: true, asked_at: ago(50) },
    { title: 'Village Halloween parade', date: '2026-10-31' },
    { title: 'Hot chocolate crawl' },
    { title: 'Cider donuts at the greenmarket' },
    { title: 'Pottery night' },
    { title: 'Union Square greenmarket', done: 7 * d },
    { title: 'Hocus Pocus movie night', done: 10 * d },
  ]);
  list('dumplings', 'dumpling map', 'irina', 'anyone', [], [
    { title: 'Soup dumplings in Flushing', done: 20 * d },
    { title: 'Pierogi in Greenpoint', done: 25 * d },
    { title: 'Momos in Jackson Heights', done: 31 * d },
    { title: 'Gyoza in the East Village', done: 44 * d },
  ]);
  list('bkweekends', 'brooklyn weekends', 'michelle', 'followers', ['irina'], [
    { title: 'Pottery night in Greenpoint', date: '2026-10-16', asking: true, asked_at: ago(4) },
    { title: 'Flea market in Dumbo' },
    { title: 'Bike the greenway' },
  ]);
  list('october', 'october', 'jordan', 'anyone', [], [
    { title: 'Village Halloween parade', date: '2026-10-31', asking: true, asked_at: ago(48) },
    { title: 'Pumpkin carving' },
  ]);
  list('fallbucket', 'fall bucket list', 'priya', 'anyone', [], [
    { title: 'Apple picking upstate', asking: true, asked_at: ago(72) },
    { title: 'Corn maze' },
  ]);

  const picnic = item_photos.find((ph) => ph.item_id === 'summer_1');
  if (picnic) picnic.path = require('../../assets/picnic.jpg');

  const star = (item_id: string, users: string[]) => users.map((user_id) => ({ item_id, user_id, created_at: ago(1) }));
  const interests = [
    ...star('nyc_1', ['michelle', 'irina', 'mengrou']),
    ...star('nyc_3', ['irina']),
    ...star('fall_1', ['michelle', 'mengrou', 'jordan']),
    ...star('bkweekends_1', ['mengrou']),
    ...star('october_1', ['sam', 'leo']),
    ...star('fallbucket_1', ['ana']),
  ];

  const events: Db['events'] = [
    { id: 'e1', actor_id: 'irina', kind: 'asked', list_id: 'fall', item_id: 'fall_1', created_at: ago(2) },
    { id: 'e2', actor_id: 'michelle', kind: 'item_added', list_id: 'bkweekends', item_id: 'bkweekends_1', created_at: ago(4) },
    { id: 'e3', actor_id: 'dana', kind: 'item_done', list_id: 'summer', item_id: 'summer_1', created_at: ago(26) },
    { id: 'e4', actor_id: 'dana', kind: 'list_done', list_id: 'summer', item_id: null, created_at: ago(26.1) },
    { id: 'e5', actor_id: 'jordan', kind: 'asked', list_id: 'october', item_id: 'october_1', created_at: ago(48) },
    { id: 'e6', actor_id: 'adanna', kind: 'list_created', list_id: 'weekends', item_id: null, created_at: ago(70) },
    { id: 'e7', actor_id: 'priya', kind: 'asked', list_id: 'fallbucket', item_id: 'fallbucket_1', created_at: ago(72) },
  ];

  return {
    me: 'dana',
    signedIn: process.env.EXPO_PUBLIC_SKIP_AUTH === '1',
    phone: '(347) 555-4821',
    profiles, follows, lists, list_members,
    list_viewers: ['adanna', 'michelle', 'irina'].map((user_id) => ({ list_id: 'bday', user_id })),
    items, item_photos, interests, events,
    contacts: ['adanna', 'michelle', 'irina', 'mengrou'],
  };
}
