/**
 * Fast paths for the granular update reconciler (KF-198 + KF-206).
 *
 * Two heuristics that catch common arraySignal-update shapes before the
 * standard parse + morph path runs and apply the change directly to the
 * live row:
 *
 *   - **Attribute-only (KF-198)**: when the only diff between old and new
 *     row HTML is in the top-level element's attribute values, call
 *     setAttribute / removeAttribute on the live node. Targets the krausest
 *     select-row scenario where 2 updates flip `class=""` ↔ `class="danger"`
 *     on a `<tr>` with otherwise identical 4-child subtree. Skips parse +
 *     morph entirely.
 *
 *   - **Text-content-only (KF-206)**: when the only diff is inside one text
 *     node's content (no entity touching, no structural or attribute
 *     change), patch that text node's nodeValue. Targets the krausest
 *     partial-update scenario where 100 updates each rewrite one label
 *     text node deep inside the row.
 *
 * Both fast paths bail conservatively on anything that could go wrong —
 * namespaced attributes (`xmlns:*` etc.), `data-morph-skip` anywhere in the
 * row, user-agent-owned attributes (`<details open>`), entity-touching
 * diffs — and the granular path falls back to `_morphElement` or
 * `replaceChild`. The sanity check at the end of the text-content path
 * (live text node's nodeValue must equal what we extracted from oldHtml)
 * is the final safety net: if anything has drifted, we bail.
 *
 * Internal to kerf.
 */

const LT = 0x3C;      // <
const GT = 0x3E;      // >
const DQUOTE = 0x22;  // "
const SQUOTE = 0x27;  // '
const AMP = 0x26;     // &
const EQ = 0x3D;      // =
const SLASH = 0x2F;   // /
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

function isWhitespace(cc: number): boolean {
  return cc === 0x20 || cc === 0x09 || cc === 0x0A || cc === 0x0D;
}

interface ParsedTag {
  tagName: string;
  attrs: Map<string, string>;
}

/**
 * KF-198. Returns true if the diff between `oldHtml` and `newHtml` was an
 * attribute-only change on the top-level element AND was applied to
 * `liveNode` directly. Caller should NOT also run the parse + morph path.
 */
export function tryAttributeOnlyFastPath(
  liveNode: Element,
  oldHtml: string,
  newHtml: string,
): boolean {
  // Kerf's JSX runtime escapes '>' to '&gt;' in attribute values and text
  // content, so the first '>' in the row HTML is always the close of the
  // top-level opening tag.
  const oldGt = oldHtml.indexOf('>');
  const newGt = newHtml.indexOf('>');
  if (oldGt === -1 || newGt === -1) return false;

  // Everything from '>' onward (children + closing tag) must be byte-equal.
  // If not, the diff is structural or includes text-content changes — defer
  // to the morph path (or the text-content fast path).
  if (oldHtml.length - oldGt !== newHtml.length - newGt) return false;
  if (oldHtml.slice(oldGt) !== newHtml.slice(newGt)) return false;

  if (containsDataMorphSkip(oldHtml) || containsDataMorphSkip(newHtml)) return false;

  const oldTag = parseOpeningTag(oldHtml, oldGt);
  const newTag = parseOpeningTag(newHtml, newGt);
  if (oldTag === null || newTag === null) return false;
  if (oldTag.tagName !== newTag.tagName) return false;

  // Pre-validate: no namespaced attribute names on either side. Setting via
  // plain setAttribute on a namespaced attribute would land it in the null
  // namespace and not match the original; bail and let morph handle it.
  for (const name of oldTag.attrs.keys()) {
    if (name.indexOf(':') !== -1) return false;
  }
  for (const name of newTag.attrs.keys()) {
    if (name.indexOf(':') !== -1) return false;
  }

  // Apply the diff.
  const liveTagUpper = liveNode.tagName;
  for (const [name, rawValue] of newTag.attrs) {
    const oldValue = oldTag.attrs.get(name);
    if (oldValue === rawValue) continue;
    liveNode.setAttribute(name, unescapeAttrValue(rawValue));
  }
  for (const name of oldTag.attrs.keys()) {
    if (newTag.attrs.has(name)) continue;
    if (isUserAgentOwnedAttr(liveTagUpper, name)) continue;
    liveNode.removeAttribute(name);
  }
  return true;
}

/**
 * KF-206. Returns true if the diff between `oldHtml` and `newHtml` was a
 * single-text-node content change AND was applied to `liveNode`'s
 * corresponding live text node directly. Caller should NOT also run the
 * parse + morph path.
 */
export function tryTextContentFastPath(
  liveNode: Element,
  oldHtml: string,
  newHtml: string,
): boolean {
  if (containsDataMorphSkip(oldHtml) || containsDataMorphSkip(newHtml)) return false;

  let p = 0;
  const minLen = Math.min(oldHtml.length, newHtml.length);
  while (p < minLen && oldHtml.charCodeAt(p) === newHtml.charCodeAt(p)) p++;
  let s = 0;
  const maxS = minLen - p;
  while (s < maxS
      && oldHtml.charCodeAt(oldHtml.length - 1 - s) === newHtml.charCodeAt(newHtml.length - 1 - s)) {
    s++;
  }

  const oldWinEnd = oldHtml.length - s;
  const newWinEnd = newHtml.length - s;

  // Diff windows must contain only text-content characters — no tag
  // delimiters, no quotes, no entities, no '=' (which would put us inside
  // an attribute). Either window having an unsafe char means this is not a
  // clean text-only change.
  if (!isPureTextWindow(oldHtml, p, oldWinEnd)) return false;
  if (!isPureTextWindow(newHtml, p, newWinEnd)) return false;

  // The char just before the equal-prefix boundary must be either '>'
  // (text node starts here) or another text-content char (we're mid-text).
  // '<' / '"' / "'" / '=' / '&' would mean we're inside a tag or entity.
  if (p === 0) return false;
  const boundaryCc = oldHtml.charCodeAt(p - 1);
  if (boundaryCc === LT || boundaryCc === DQUOTE || boundaryCc === SQUOTE
      || boundaryCc === EQ || boundaryCc === AMP) return false;

  // Find the text node's HTML-string boundaries. Text node containing
  // position p starts after the most recent '>' before p in oldHtml; ends
  // at the next '<' at or after p.
  const textStart = lastIndexOfChar(oldHtml, GT, p - 1);
  if (textStart === -1) return false;
  const textEnd = oldHtml.indexOf('<', p);
  if (textEnd === -1) return false;
  // The diff window in oldHtml must lie entirely within this text node.
  if (textEnd < oldWinEnd) return false;
  // newHtml's corresponding `<` position is shifted by the length delta
  // (the diff window is entirely inside this text node, so everything after
  // it is in the equal-suffix region).
  const newTextEnd = textEnd + (newHtml.length - oldHtml.length);
  const oldText = oldHtml.slice(textStart + 1, textEnd);
  const newText = newHtml.slice(textStart + 1, newTextEnd);

  // KF-374: a binding TEXT marker (`<!--kfb:…-->` / `<!--kfbr:…-->`) earlier
  // in the row means the LIVE row carries an extra wiring-inserted text node
  // the HTML string doesn't contain — the HTML-position → nth-live-text-node
  // mapping below would be off by one, and the nodeValue safety net could be
  // defeated by a coincidental value match (patching the bound node instead
  // of the static one). Bail to the morph path, which pairs marker-owned
  // nodes correctly. Markers at/after the diff's text node don't shift the
  // index and stay on the fast path.
  if (oldHtml.lastIndexOf('<!--kfb', textStart) !== -1) return false;

  // Find the text-node-index in document order.
  const textIdx = countTextNodesBefore(oldHtml, textStart + 1);
  const targetNode = nthTextNodeDescendant(liveNode, textIdx);
  if (targetNode === null) return false;

  // Final safety net: the live text node's nodeValue must equal the text
  // we extracted from oldHtml. If it differs (HTML-string vs live drift,
  // browser whitespace normalization, imperative mutation, etc.), bail
  // so the morph path can do its safe thing.
  if (targetNode.nodeValue !== oldText) return false;

  targetNode.nodeValue = newText;
  return true;
}

function containsDataMorphSkip(html: string): boolean {
  return html.indexOf('data-morph-skip') !== -1;
}

function isPureTextWindow(html: string, start: number, end: number): boolean {
  for (let i = start; i < end; i++) {
    const cc = html.charCodeAt(i);
    if (cc === LT || cc === GT || cc === DQUOTE || cc === SQUOTE
        || cc === AMP || cc === EQ) return false;
  }
  return true;
}

function lastIndexOfChar(html: string, target: number, beforeInclusive: number): number {
  for (let i = beforeInclusive; i >= 0; i--) {
    if (html.charCodeAt(i) === target) return i;
  }
  return -1;
}

/**
 * Count text-content runs (non-empty stretches between `>` and `<`) that
 * START before `beforePos` in `html`. Used to convert an HTML-string
 * position to the corresponding text-node-index in document order. Relies
 * on kerf-emitted HTML's invariant that `<` / `>` outside attribute values
 * always denote tag boundaries (entities escape them everywhere else).
 */
function countTextNodesBefore(html: string, beforePos: number): number {
  let count = 0;
  let i = 0;
  while (i < beforePos) {
    if (html.charCodeAt(i) === LT) {
      while (i < beforePos && html.charCodeAt(i) !== GT) i++;
      i++;
    } else {
      const start = i;
      while (i < beforePos && html.charCodeAt(i) !== LT) i++;
      if (i > start) count++;
    }
  }
  return count;
}

function nthTextNodeDescendant(root: Element, n: number): Text | null {
  let count = 0;
  let result: Text | null = null;
  function walk(node: Node): void {
    for (let c = node.firstChild; c !== null; c = c.nextSibling) {
      if (result !== null) return;
      if (c.nodeType === TEXT_NODE) {
        if (count === n) {
          result = c as Text;
          return;
        }
        count++;
      } else if (c.nodeType === ELEMENT_NODE) {
        walk(c);
      }
    }
  }
  walk(root);
  return result;
}

/**
 * Parse the top-level opening tag of `html` whose closing `>` is at
 * `gtPos`. Returns null on any malformed shape (missing tag name,
 * unquoted attribute values, unterminated attribute, etc.) so the caller
 * bails to the morph path. Kerf's JSX runtime emits well-formed,
 * double-quoted attribute values, so the success path is the common one.
 */
function parseOpeningTag(html: string, gtPos: number): ParsedTag | null {
  if (html.charCodeAt(0) !== LT) return null;
  let i = 1;
  let end = gtPos;
  // Self-closing slash (e.g. `<br/>`) — drop it from the parse range.
  if (i < end && html.charCodeAt(end - 1) === SLASH) end -= 1;

  const nameStart = i;
  while (i < end) {
    const cc = html.charCodeAt(i);
    if (isWhitespace(cc)) break;
    i++;
  }
  const tagName = html.slice(nameStart, i);
  if (tagName.length === 0) return null;

  const attrs = new Map<string, string>();
  while (i < end) {
    while (i < end && isWhitespace(html.charCodeAt(i))) i++;
    if (i >= end) break;
    const aNameStart = i;
    while (i < end) {
      const cc = html.charCodeAt(i);
      if (cc === EQ || isWhitespace(cc)) break;
      i++;
    }
    const aName = html.slice(aNameStart, i);
    if (aName.length === 0) return null;
    while (i < end && isWhitespace(html.charCodeAt(i))) i++;
    if (i < end && html.charCodeAt(i) === EQ) {
      i++;
      while (i < end && isWhitespace(html.charCodeAt(i))) i++;
      if (i >= end) return null;
      const q = html.charCodeAt(i);
      if (q !== DQUOTE && q !== SQUOTE) return null;
      i++;
      const vStart = i;
      while (i < end && html.charCodeAt(i) !== q) i++;
      if (i >= end) return null;
      attrs.set(aName, html.slice(vStart, i));
      i++;
    } else {
      attrs.set(aName, '');
    }
  }
  return { tagName, attrs };
}

/**
 * Reverse the five entities kerf's `escapeAttr` produces. Replace in safe
 * order (named entities first; `&amp;` last so its decode doesn't pick up
 * the `&` we just emitted from a different decode).
 */
function unescapeAttrValue(s: string): string {
  if (s.indexOf('&') === -1) return s;
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * `<details>` and `<dialog>` toggle `open` themselves in response to user
 * interaction. Mirror `morphAttributes`' rule: never remove `open` on them
 * during the fast path — the user-driven state would be wiped.
 */
function isUserAgentOwnedAttr(tagNameUpper: string, name: string): boolean {
  return name === 'open' && (tagNameUpper === 'DETAILS' || tagNameUpper === 'DIALOG');
}
