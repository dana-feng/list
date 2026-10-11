import type { Profile } from '@/api/db';
import { db } from '@/api/db';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Item dates are plain YYYY-MM-DD, so parse them as local days rather than UTC.
export function parseDay(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "sat, oct 17" */
export function longDay(date: string) {
  const d = parseDay(date);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "sat 10/17" */
export function shortDay(date: string) {
  const d = parseDay(date);
  return `${DAYS[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

export function dayParts(date: string) {
  const d = parseDay(date);
  return { weekday: DAYS[d.getDay()].toUpperCase(), day: String(d.getDate()) };
}

/** "oct 2026" */
export function monthYear(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "oct 3", from a timestamp */
export function monthDay(iso: string) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** "you + adanna" */
export function names(people: Profile[]) {
  return people.map((p) => (p.id === db.me ? 'you' : p.name)).join(' + ');
}
