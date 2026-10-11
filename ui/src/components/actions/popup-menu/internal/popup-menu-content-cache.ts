import type { SafeHtml } from 'kerfjs';

import type { PopupMenuEntry } from '../popup-menu.js';

/**
 * Streaming content hash: slot 0 is the FNV-1a digest that names
 * the menu's `data-key`; slot 1 is an independent check hash (a 31-multiplier
 * polynomial whose dependency chain runs in parallel with the digest's), so
 * the markup cache is keyed by about 64 bits and a digest collision cannot
 * serve another menu's markup. An `Int32Array` keeps both accumulators unboxed
 * between calls.
 */
const hashState = new Int32Array(2);

function hashCode(code: number): void {
  hashState[0] = Math.imul(hashState[0]! ^ code, 0x01000193);
  hashState[1] = (Math.imul(hashState[1]!, 31) + code) | 0;
}

/**
 * Hash a string's code points. A surrogate pair is combined into one code
 * point, matching the former `for…of` iteration over the joined key, so the
 * digest, and with it the rendered `data-key`, is unchanged.
 */
function hashText(text: string): void {
  let digest = hashState[0]!;
  let check = hashState[1]!;
  const length = text.length;
  for (let index = 0; index < length; index++) {
    let code = text.charCodeAt(index);
    if ((code & 0xfc00) === 0xd800 && index + 1 < length) {
      const low = text.charCodeAt(index + 1);
      if ((low & 0xfc00) === 0xdc00) {
        code = ((code - 0xd800) << 10) + (low - 0xdc00) + 0x10000;
        index++;
      }
    }
    digest = Math.imul(digest ^ code, 0x01000193);
    check = (Math.imul(check, 31) + code) | 0;
  }
  hashState[0] = digest;
  hashState[1] = check;
}

/**
 * Parts at least this long (icon and details markup) are hashed through
 * {@link hashLongText}: by a memoized digest of the whole string instead of
 * character by character, so a glyph repeated on every row costs a map lookup.
 */
export const LONG_PART_LENGTH = 64;

/** Bound on memoized long-part digests; past it the oldest is evicted. */
export const PART_DIGEST_LIMIT = 4096;
const partDigests = new Map<string, readonly [number, number]>();

/**
 * Feed a long part as its own two hashes. A Lucide SVG is a few hundred
 * characters and repeats across every row's menu, so hashing its characters
 * dominated an unchanged menu's cost; V8 hashes a string key natively (once
 * per string object) and compares equal strings quickly.
 */
function hashLongText(text: string): void {
  let pair = partDigests.get(text);
  if (!pair) {
    const digest = hashState[0]!;
    const check = hashState[1]!;
    hashState[0] = 0x811c9dc5;
    hashState[1] = 0x9747b28c;
    hashText(text);
    pair = [hashState[0], hashState[1]];
    hashState[0] = digest;
    hashState[1] = check;
    if (partDigests.size >= PART_DIGEST_LIMIT)
      partDigests.delete(partDigests.keys().next().value!);
    partDigests.set(text, pair);
  }
  hashCode(pair[0]);
  hashCode(pair[1]);
}

/** Hash a part, through its memoized digest when it is long. */
function hashPart(text: string): void {
  if (text.length >= LONG_PART_LENGTH) hashLongText(text);
  else hashText(text);
}

const PART_SEPARATOR = 0x00;
const FIELD_SEPARATOR = 0x01;

/**
 * Feed one entry's structure: the fields, in order, separated by U+0001, with
 * each submenu entry appended the same way.
 */
function hashEntry(entry: PopupMenuEntry): void {
  if (entry.kind === 'divider') {
    hashCode(0x2d); // '-'
    return;
  }
  if (entry.kind === 'heading') {
    hashCode(0x23); // '#'
    hashText(entry.label);
    return;
  }
  hashText(entry.label);
  hashCode(FIELD_SEPARATOR);
  hashText(entry.action ?? '');
  hashCode(FIELD_SEPARATOR);
  hashText(entry.value ?? '');
  hashCode(FIELD_SEPARATOR);
  hashCode(entry.disabled ? 0x31 : 0x30);
  hashCode(FIELD_SEPARATOR);
  hashCode(entry.checked === undefined ? 0x2d : entry.checked ? 0x31 : 0x30);
  hashCode(FIELD_SEPARATOR);
  hashText(entry.tone ?? '');
  hashCode(FIELD_SEPARATOR);
  hashText(entry.disabledReason ?? '');
  hashCode(FIELD_SEPARATOR);
  // SafeHtml stringifies to its stored markup without copying, and the key
  // must change when an icon or details change.
  hashPart(String(entry.icon ?? ''));
  hashCode(FIELD_SEPARATOR);
  hashPart(String(entry.details ?? ''));
  hashCode(FIELD_SEPARATOR);
  hashText(entry.attributes ? JSON.stringify(entry.attributes) : '{}');
  for (const child of entry.submenu ?? []) {
    hashCode(FIELD_SEPARATOR);
    hashEntry(child);
  }
}

/**
 * Bounded, least-recently-used cache of each menu's trigger and entry markup,
 * keyed by its content hashes. A list that re-renders unchanged menus then
 * pays one hash pass per menu instead of rendering every entry again, which
 * the morph would discard under `data-morph-skip-children` anyway. Sized above
 * a large list's distinct menus; past it, renders fall back to fresh markup.
 */
export const MARKUP_CACHE_LIMIT = 1024;
const markupCache = new Map<string, SafeHtml>();

/**
 * The menu's `data-key` and its cache key. The digest covers, in order and
 * separated by U+0000, the trigger parts and then each entry, whose fields are
 * separated by U+0001; it is the FNV-1a hash of that joined text, except that
 * a part of {@link LONG_PART_LENGTH} or more characters contributes its own
 * two hashes in place of its characters.
 */
export function popupMenuContentKey(
  triggerParts: readonly string[],
  items: readonly PopupMenuEntry[],
): { key: string; cacheKey: string } {
  hashState[0] = 0x811c9dc5;
  hashState[1] = 0x9747b28c;
  for (let index = 0; index < triggerParts.length; index++) {
    if (index > 0) hashCode(PART_SEPARATOR);
    hashPart(triggerParts[index]!);
  }
  for (const entry of items) {
    hashCode(PART_SEPARATOR);
    hashEntry(entry);
  }
  const digest = (hashState[0]! >>> 0).toString(36);
  return {
    key: `kui-popup-menu-${digest}`,
    cacheKey: `${digest}:${(hashState[1]! >>> 0).toString(36)}`,
  };
}

/** Cached markup for a cache key, refreshed as most recently used. */
export function cachedPopupMenuContent(cacheKey: string): SafeHtml | undefined {
  const content = markupCache.get(cacheKey);
  if (content) {
    markupCache.delete(cacheKey);
    markupCache.set(cacheKey, content);
  }
  return content;
}

/**
 * Remember rendered markup, evicting the least recently used entry when full.
 * Only static markup is reusable: content that holds a keyed list must be
 * rendered in each pass for the list reconciler.
 */
export function cachePopupMenuContent(
  cacheKey: string,
  content: SafeHtml,
): void {
  if (content.__segment.kind !== 'static') return;
  if (markupCache.size >= MARKUP_CACHE_LIMIT)
    markupCache.delete(markupCache.keys().next().value!);
  markupCache.set(cacheKey, content);
}

/** Test hook: drop cached menu markup and memoized part digests. */
export function _clearPopupMenuMarkupCache(): void {
  markupCache.clear();
  partDigests.clear();
}

/** Test hook: the number of memoized long-part digests. */
export function _popupMenuPartDigestCount(): number {
  return partDigests.size;
}

/** Test hook: the number of cached menu markups. */
export function _popupMenuMarkupCacheSize(): number {
  return markupCache.size;
}
