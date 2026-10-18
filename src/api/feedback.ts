// Feedback from settings. It goes to a table only the team can read, and from there to the
// team's Google Sheet (see docs/FEEDBACK.md).
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { db } from './db';
import { supabase } from './supabase';
import { write } from './sync';

export const FEEDBACK_MAX = 4000;

/** Blank is fine (it's optional); otherwise it has to look like an email. Same rule as the database. */
export const emailOk = (email: string) => !email.trim() || (email.trim().length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()));

/** In the order the feedback sheet lists them. The key is what's saved. */
export const FEEDBACK_KINDS = [
  { key: 'bug', label: 'bug' },
  { key: 'idea', label: 'feature request' },
  { key: 'other', label: 'something else' },
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]['key'];

/** Resolves to whether it was saved. */
export function sendFeedback(kind: FeedbackKind, message: string, email = '') {
  return write(
    () => supabase.from('feedback').insert({
      profile_id: db.me,
      kind,
      message: message.trim().slice(0, FEEDBACK_MAX),
      email: email.trim(),
      app_version: Constants.expoConfig?.version ?? '',
      platform: `${Platform.OS} ${Platform.Version}`.slice(0, 40),
    }),
    'your feedback',
  );
}
