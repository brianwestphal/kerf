/**
 * Change-scoped morph for surrounds-changed re-renders.
 *
 * `mount()`'s surrounds-changed path re-parses the WHOLE static HTML and morphs
 * the whole tree even when one attribute on one row changed. On a large page
 * (one `mount()`, plain `.map()` rows or a details pane beside an `each()`)
 * that makes every re-render cost O(page) in parse + morph.
 * `morphStaticChange` instead:
 *
 *  1. finds the byte range where the previous and next static HTML differ
 *     (common prefix / suffix);
 *  2. scans both strings with a small tag-structure scanner and picks the
 *     innermost element whose open tag sits in the common prefix and whose
 *     close tag sits in the common suffix (the host), then the run of the
 *     host's element children overlapping the changed range — same count, same
 *     tags, identical text between them in both strings;
 *  3. locates the host in the live tree by element-child indices, verifying
 *     tag and element-child count at every level;
 *  4. parses only the changed children (in the host's own parsing context) and
 *     morphs each against its live counterpart with the same per-element morph
 *     the full walk applies once it has paired them.
 *
 * It returns `false` — the caller then runs the full parse + morph — on
 * anything it cannot prove equivalent: markup the scanner doesn't model
 * (unbalanced or mismatched tags, doctype / bogus comments, `noscript`, a
 * quote outside an attribute value), table-family elements outside their
 * required parents or text directly inside a table box (the parser would
 * foster-parent or drop them), a live structure that disagrees with the
 * previous render's string (including any path element that holds `each()`
 * rows, which the static string omits — so a change in or after a list's rows
 * declines while a change beside it is scoped), `data-morph-skip(-children)` or
 * the focused element on the path, or a changed child whose key / protection
 * attributes would make the full walk replace rather than morph it.
 * Parser-context-sensitive ancestors (`p`, `li`, `a`, formatting elements,
 * `select`, `template`, foreign content, headings, …) are never used as a
 * parse context: the host climbs above the topmost one.
 *
 * Internal. One primary export.
 */

import { captureFocus, restoreFocus } from './list-reconcile-focus.js';
import { _morphElement } from './morph.js';

/**
 * Element table for one HTML string: element 0 is the mount root, the rest in
 * document order. `r` holds `W` numbers per element at the offsets below.
 */
export interface StaticScan {
  tag: string[];
  r: number[];
}

/** Last string scanned + its scan, carried between renders by `mount()`. */
export interface StaticScanCache {
  html: string;
  scan: StaticScan | null;
}

// Record offsets.
const START = 0;
const OPEN_END = 1;
const CLOSE = 2;
const END = 3;
const PARENT = 4;
/** Element-child index within the parent. */
const INDEX = 5;
/** Element-child count. */
const COUNT = 6;
const FIRST = 7;
const NEXT = 8;
const FLAG = 9;
/** Last element child, only while scanning. */
const LAST = 10;
const W = 11;

// Tag flags.
const VOID = 1;
const RAW = 2;
const REFUSE = 4;
/** Table box: every direct child must be table-family (no foster parenting). */
const BOX = 8;
/** Changes how descendants parse while open on the parser's stack. */
const SENSITIVE = 16;
const FOREIGN = 32;
const FLAGS = new Map<string, number>();
for (const [tags, bit] of [
  [
    'area base basefont bgsound br col embed frame hr img input keygen link meta param source track wbr',
    VOID,
  ],
  ['script style textarea title xmp iframe noembed noframes', RAW],
  ['html head body frameset image noscript plaintext', REFUSE],
  ['table tbody thead tfoot tr colgroup', BOX],
  [
    'p li dd dt a button nobr select option optgroup datalist ruby rb rt rtc rp svg math template h1 h2 h3 h4 h5 h6 b big code em font i s small strike strong tt u',
    SENSITIVE,
  ],
  ['svg math', FOREIGN],
] as const) {
  for (const t of tags.split(' ')) FLAGS.set(t, (FLAGS.get(t) ?? 0) | bit);
}
/** Table family: the only parents each may have in the static output. */
const TABLE_PARENT: Record<string, string | undefined> = {
  tr: ' tbody thead tfoot ',
  td: ' tr ',
  th: ' tr ',
  tbody: ' table ',
  thead: ' table ',
  tfoot: ' table ',
  caption: ' table ',
  colgroup: ' table ',
  col: ' colgroup ',
};
const isSpace = (c: number): boolean =>
  c === 32 || c === 9 || c === 10 || c === 12 || c === 13;

/**
 * Scan `html` (rendered inside an element whose tag is `rootTag`) into an
 * element table, or `null` if it holds anything the scanner won't model.
 */
export function scanStatic(html: string, rootTag: string): StaticScan | null {
  const len = html.length;
  const tag = [rootTag];
  const r = [-1, 0, len, len, -1, 0, 0, -1, -1, FLAGS.get(rootTag) ?? 0, -1];
  const stack = [0];
  let textFrom = 0;
  // Memoized next-quote positions (`>>> 0` maps "none" to 2^32-1), so a rare
  // quote character isn't re-searched to the end of the string on every tag.
  let dq = -1;
  let sq = -1;
  /** Text since `textFrom` is whitespace-only (required inside a table box). */
  const blankUntil = (to: number): boolean => {
    for (let k = textFrom; k < to; k++)
      if (!isSpace(html.charCodeAt(k))) return false;
    return true;
  };
  for (let i = 0; (i = html.indexOf('<', i)) !== -1;) {
    const top = stack[stack.length - 1];
    const topFlag = r[top * W + FLAG];
    const c = html.charCodeAt(i + 1);
    if (c !== 33 && c !== 47 && !((c | 32) >= 97 && (c | 32) <= 122)) {
      i++; // a literal '<' in text
      continue;
    }
    if (topFlag & BOX && !blankUntil(i)) return null;
    if (c === 33) {
      // Only well-formed `<!--…-->` comments; doctype / bogus comments refuse.
      const e = html.indexOf('-->', i + 4);
      if (!html.startsWith('!--', i + 1) || e < 0) return null;
      const body = html.slice(i + 4, e);
      if (body[0] === '>' || body.startsWith('->') || body.includes('--!>'))
        return null;
      i = textFrom = e + 3;
      continue;
    }
    if (c === 47) {
      const gt = html.indexOf('>', i);
      if (top === 0 || gt < 0) return null;
      const t = tag[top];
      let j = i + 2 + t.length;
      if (!html.startsWith(t, i + 2)) {
        // Uppercase or mismatched end tag: compare the real name.
        j = i + 2;
        while (j < gt && !isSpace(html.charCodeAt(j))) j++;
        if (html.slice(i + 2, j).toLowerCase() !== t) return null;
      } else if (j !== gt && !isSpace(html.charCodeAt(j))) return null;
      stack.pop();
      r[top * W + CLOSE] = i;
      i = textFrom = r[top * W + END] = gt + 1;
      continue;
    }
    let j = i + 1;
    let ch: number;
    while (
      j < len &&
      !isSpace((ch = html.charCodeAt(j))) &&
      ch !== 47 &&
      ch !== 62
    )
      j++;
    const name = html.slice(i + 1, j).toLowerCase();
    const flag = FLAGS.get(name) ?? 0;
    // Find the open tag's `>`, jumping over quoted attribute values. A quote
    // anywhere but right after `=` (spaces allowed) is refused.
    for (;;) {
      const gt = html.indexOf('>', j);
      if (gt < 0) return null;
      if (dq < j) dq = html.indexOf('"', j) >>> 0;
      if (sq < j) sq = html.indexOf("'", j) >>> 0;
      const qpos = dq < sq ? dq : sq;
      if (qpos > gt) {
        j = gt;
        break;
      }
      let k = qpos - 1;
      while (isSpace(html.charCodeAt(k))) k--;
      const close = html.indexOf(html[qpos], qpos + 1);
      if (html.charCodeAt(k) !== 61 || close < 0) return null;
      j = close + 1;
    }
    const want = TABLE_PARENT[name];
    if (
      flag & REFUSE ||
      (want !== undefined ? !want.includes(` ${tag[top]} `) : topFlag & BOX)
    )
      return null;
    const e = tag.length;
    const p = top * W;
    const last = r[p + LAST];
    if (last < 0) r[p + FIRST] = e;
    else r[last * W + NEXT] = e;
    r[p + LAST] = e;
    tag.push(name);
    r.push(i, j + 1, j + 1, j + 1, top, r[p + COUNT]++, 0, -1, -1, flag, -1);
    i = textFrom = j + 1;
    if (flag & (FOREIGN | RAW)) {
      // Foreign content is opaque: find the matching close, counting nesting
      // of the same tag (`/>` self-closes there). Raw text runs to its close.
      const re = new RegExp(`<(/?)${name}[\\s/>]`, 'gi');
      re.lastIndex = i;
      let depth = flag & FOREIGN && html[j - 1] === '/' ? 0 : 1;
      while (depth > 0) {
        const m = re.exec(html);
        if (m === null) return null;
        const gt = html.indexOf('>', m.index);
        if (m[1] === '/') depth--;
        else if (flag & FOREIGN && html[gt - 1] !== '/') depth++;
        r[e * W + CLOSE] = m.index;
        i = textFrom = r[e * W + END] = gt + 1;
      }
    } else if (!(flag & VOID)) {
      stack.push(e);
    }
  }
  return stack.length > 1 || (r[FLAG] & BOX && !blankUntil(len))
    ? null
    : { tag, r };
}

/**
 * Length of the common prefix (or, `fromEnd`, suffix) of `a` and `b`, capped
 * at `max`. Gallops with native chunk compares, then finishes per character —
 * a per-character loop alone costs milliseconds on a megabyte page.
 */
function commonRun(
  a: string,
  b: string,
  max: number,
  fromEnd: boolean,
): number {
  const at = (s: string, from: number, to: number): string =>
    fromEnd ? s.slice(s.length - to, s.length - from) : s.slice(from, to);
  let n = 0;
  for (let step = 1024; n < max;) {
    const to = Math.min(n + step, max);
    if (at(a, n, to) === at(b, n, to)) {
      n = to;
      step *= 2;
    } else if (step > 16) step >>= 2;
    else break;
  }
  while (n < max && at(a, n, n + 1) === at(b, n, n + 1)) n++;
  return n;
}

/** The host's element children whose span overlaps the edit `[p, to)`. */
function overlapping(s: StaticScan, host: number, p: number, to: number) {
  const out: number[] = [];
  for (let c = s.r[host * W + FIRST]; c >= 0; c = s.r[c * W + NEXT])
    if (s.r[c * W + END] > p && s.r[c * W + START] < to) out.push(c);
  return out;
}

/**
 * Morph only the changed children of the innermost safely-parseable element
 * enclosing the `prev` → `next` edit. Returns `false` (nothing touched) when
 * the edit can't be proven equivalent to a full morph; the caller then runs the
 * full parse + morph. `cache` carries `next`'s scan to the next render.
 */
export function morphStaticChange(
  rootEl: Element,
  prev: string,
  next: string,
  cache: StaticScanCache,
  ownedItems: ReadonlySet<Element>,
): boolean {
  const rootTag = rootEl.localName;
  const sa = cache.html === prev ? cache.scan : scanStatic(prev, rootTag);
  const sb = scanStatic(next, rootTag);
  cache.html = next;
  cache.scan = sb;
  if (sa === null || sb === null) return false;
  const a = sa.r;
  const b = sb.r;

  const delta = next.length - prev.length;
  const p = commonRun(prev, next, Math.min(prev.length, next.length), false);
  const q = commonRun(prev, next, Math.min(prev.length, next.length) - p, true);
  const aEnd = prev.length - q;

  // Innermost element enclosing the edit — open tag in the prefix, close tag
  // in the suffix — starting from the last element opening before the edit
  // (binary search over the document-ordered starts; the root always
  // qualifies).
  let host = 0;
  for (let lo = 1, hi = sa.tag.length - 1; lo <= hi;) {
    const mid = (lo + hi) >> 1;
    if (a[mid * W + START] < p) {
      host = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  while (!(a[host * W + OPEN_END] <= p && a[host * W + CLOSE] >= aEnd))
    host = a[host * W + PARENT];
  // Climb above the topmost parser-context-sensitive ancestor.
  for (let x = host; x > 0; x = a[x * W + PARENT])
    if (a[x * W + FLAG] & SENSITIVE) host = a[x * W + PARENT];

  // Find the run of the host's element children covering the edit; on any
  // mismatch climb a level (the host itself becomes the changed child).
  let olds: number[];
  let news: number[];
  for (; ; host = a[host * W + PARENT]) {
    if (host < 0) return false;
    if (b[host * W + CLOSE] - delta !== a[host * W + CLOSE]) continue;
    olds = overlapping(sa, host, p, aEnd);
    news = overlapping(sb, host, p, next.length - q);
    const k = olds.length;
    let ok =
      k > 0 &&
      k === news.length &&
      a[olds[0] * W + START] <= p &&
      b[news[0] * W + START] <= p &&
      a[olds[k - 1] * W + END] >= aEnd &&
      b[news[k - 1] * W + END] - delta === a[olds[k - 1] * W + END];
    for (let m = 0; ok && m < k; m++) {
      ok =
        sa.tag[olds[m]] === sb.tag[news[m]] &&
        (m === 0 ||
          prev.slice(a[olds[m - 1] * W + END], a[olds[m] * W + START]) ===
            next.slice(b[news[m - 1] * W + END], b[news[m] * W + START]));
    }
    if (ok) break;
  }

  // Walk the live tree down to the host, verifying shape at every level.
  if (rootEl.childElementCount !== a[COUNT]) return false;
  const path: number[] = [];
  for (let x = host; x > 0; x = a[x * W + PARENT]) path.push(x);
  let live: Element = rootEl;
  for (let m = path.length - 1; m >= 0; m--) {
    const x = path[m];
    const el = live.children[a[x * W + INDEX]] as HTMLElement;
    if (
      el.localName !== sa.tag[x] ||
      el.childElementCount !== a[x * W + COUNT] ||
      el.dataset.morphSkip !== undefined ||
      el.dataset.morphSkipChildren !== undefined ||
      el === document.activeElement
    )
      return false;
    live = el;
  }

  // Parse only the changed children, in the host's own parsing context.
  const lives: Element[] = [];
  let html = '';
  for (let m = 0; m < olds.length; m++) {
    const o = olds[m] * W;
    const n = news[m] * W;
    const nextChild = next.slice(b[n + START], b[n + END]);
    if (prev.slice(a[o + START], a[o + END]) === nextChild) continue;
    const el = live.children[a[o + INDEX]];
    if (el.localName !== sa.tag[olds[m]]) return false;
    lives.push(el);
    html += nextChild;
  }
  const tpl = live.cloneNode(false) as Element;
  tpl.innerHTML = html;
  const tos = tpl.childNodes;
  if (tos.length !== lives.length) return false;
  for (let m = 0; m < lives.length; m++) {
    const from = lives[m] as HTMLElement;
    const to = tos[m] as HTMLElement;
    // The full walk pairs these only when their key agrees and, unkeyed,
    // their protection attributes agree; otherwise it would replace.
    if (
      to.localName !== from.localName ||
      keyOf(from) !== keyOf(to) ||
      (keyOf(from) === '' && protectionOf(from) !== protectionOf(to))
    )
      return false;
  }
  const focusSnap = captureFocus(live);
  for (let m = 0; m < lives.length; m++)
    _morphElement(lives[m], tos[m] as Element, ownedItems);
  if (focusSnap !== null) restoreFocus(focusSnap);
  return true;
}

function keyOf(el: HTMLElement): string {
  return el.id !== ''
    ? `#${el.id}`
    : el.dataset.key !== undefined
      ? `k${el.dataset.key}`
      : '';
}

function protectionOf(el: HTMLElement): string {
  const d = el.dataset;
  return `${d.morphSkip !== undefined}${d.morphSkipChildren !== undefined}${d.morphPreserve !== undefined}`;
}
