// How big things can get. The database enforces the same numbers (the caps migration, plus the
// title/name/bio/comment checks from earlier ones); keep the two in step.

export const LIST_TITLE_MAX = 80;
export const ITEM_TITLE_MAX = 120;
export const NOTES_MAX = 2000;
export const NAME_MAX = 50;

export const ITEMS_PER_LIST = 200;
export const PHOTOS_PER_ITEM = 10;
export const LISTS_PER_PERSON = 100;

/** Photos are shrunk to this many pixels on their long side before they're uploaded. */
export const PHOTO_LONG_SIDE = 1600;
