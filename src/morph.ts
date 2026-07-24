/**
 * `morph(liveRoot, template)` — minimum-mutation DOM reconciliation.
 *
 * Public primitive (KF-150): one-shot reconciliation against an
 * already-populated element. `mount()` first paints by writing
 * `innerHTML`; `morph()` is the "I have a live tree and a template,
 * reconcile them in place" sibling. Use it for SSR hydration of static
 * fragments, page-refresh diffs, third-party widget remounts, etc.
 *
 * Replaces our previous dependency on `morphdom`. The algorithm is the
 * classic two-tree walk: match children by key (id, then data-key, then
 * positional same-tag), morph matches in place, insert / remove / clone
 * the rest. Specialized for what kerf needs:
 *
 * - `childrenOnly` is always true; the live root is never replaced.
 * - Per-element short-circuits: `data-morph-skip` (library-owned, leave
 *   element AND subtree verbatim), `data-morph-skip-children` (KF-152 —
 *   morph attrs on the element, leave its subtree verbatim — for
 *   client-hydrated slots whose loading/state classes still need to flow
 *   through), and `isEqualNode` (byte-identical, no work needed).
 * - **`data-morph-preserve`** protects a node at ITS OWN level only — an
 *   ancestor the template drops still takes the whole subtree, preserved
 *   descendants included (KF-386: intended, but easy to over-read, so it is
 *   pinned by tests and stated in docs/4-render.md §4.3).
 * - **`data-morph-preserve`** (KF-151) is honored in the trailing-removal
 *   pass: an unmatched live element with this attribute is skipped instead
 *   of removed. Lets imperatively-injected nodes (autoplay `<video>`s,
 *   tour-widget tooltips, analytics pixels) survive across renders without
 *   having to `data-morph-skip` the entire parent.
 * - **`ownedItems`** is the set of element nodes owned by an `each()`
 *   list reconciler. The morph skips them in every children walk —
 *   they're not added to the keyed-lookup map, the from-cursor advances
 *   past them, and the trailing-removal pass leaves them in place. This
 *   lets each() coexist with non-list siblings inside the same parent
 *   (KF-102 round 2): the morph still walks the parent's children to
 *   reconcile siblings, but never disturbs list rows. The parameter is an
 *   internal coordination channel between `mount()` and the reconciler;
 *   public callers should omit it (the default empty set is correct for
 *   any tree that isn't being managed by an active `mount()`).
 * - Focused text inputs (`<input>`/`<textarea>`) keep their value +
 *   selection across the morph; focused `[contenteditable]` keeps its
 *   entire subtree (typed content + caret + multi-range selection).
 *
 * Algorithm credit: based on the design of
 * https://github.com/patrick-steele-idem/morphdom by Patrick Steele-Idem
 * (MIT licensed). Reimplemented here so kerf can specialize the hot paths
 * (segment-aware list dispatch, lighter callback surface) and drop the
 * runtime dependency. Original copyright preserved in `LICENSE`.
 */

import { boundTextNodeOf, ROW_TEXT_PREFIX, TEXT_MARKER_PREFIX } from './bindings.js';
import type { SafeHtml } from './jsx-runtime.js';
import { captureFocus, restoreFocus } from './list-reconcile-focus.js';
import { LIST_MARKER_PREFIX } from './segment.js';
import { syncFormProp } from './utils/syncFormProp.js';

const ID_KEY_PREFIX = 'id:';
const DATA_KEY_PREFIX = 'data-key:';
// Local numeric copies of Node.ELEMENT_NODE etc. — the child-walk loop below
// is the hottest path in the reconciler, and reading a module-scope const
// avoids the Node global property lookup per visited node. Don't "normalize"
// these to Node.* without re-checking the krausest partial-update numbers.
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;

function getNodeKey(node: Node): string | undefined {
  if (node.nodeType !== ELEMENT_NODE) return undefined;
  const el = node as HTMLElement;
  if (el.id !== '') return `${ID_KEY_PREFIX}${el.id}`;
  if (el.dataset !== undefined && el.dataset.key !== undefined) {
    return `${DATA_KEY_PREFIX}${el.dataset.key}`;
  }
  return undefined;
}

const EMPTY_OWNED: ReadonlySet<Element> = new Set();

/**
 * Reconcile the children of `liveRoot` to match `template`.
 *
 * `template` can be an `Element` (used directly), a `SafeHtml`, or a raw
 * HTML string — the latter two are stringified and parsed into a transient
 * element whose tag matches `liveRoot`. The active text-entry / focused-
 * contenteditable preservation rules apply in all cases.
 *
 * `ownedItems` is an internal coordination channel for `mount()`'s list
 * reconciler; public callers should omit it.
 */
export function morph(
  liveRoot: Element,
  template: Element | SafeHtml | string,
  ownedItems: ReadonlySet<Element> = EMPTY_OWNED,
): void {
  if (liveRoot == null) {
    throw new Error(
      'morph: liveRoot is null/undefined — pass the live element, e.g. morph(document.getElementById("app")!, template). '
      + 'A common cause is a typo in the id or selector that returns null at runtime even though the TypeScript types say Element.',
    );
  }
  const templateEl: Element = isElementNode(template)
    ? template
    : parseTemplate(liveRoot, template);
  // Some engines (older Safari, happy-dom) blur a focused descendant on
  // `insertBefore` even though the node survives the move connected. Every
  // move path in the walk below can hit that — the keyed match, the element
  // lookahead, the marker run — so capture once here and restore once after,
  // rather than per move. This is what makes mount()'s documented promise
  // ("element identity, and thus focus, is preserved wherever the diff
  // matches") true for moved subtrees and not just morphed-in-place ones.
  // One activeElement read per morph; `restoreFocus` no-ops when nothing moved.
  const focusSnap = captureFocus(liveRoot);
  morphChildren(liveRoot, templateEl, ownedItems);
  if (focusSnap !== null) restoreFocus(focusSnap);
}

/**
 * Internal: morph `fromEl` to match `toEl` including the element's own
 * attributes (which the public `morph()` does NOT touch — it only morphs
 * children of the live root). Used by `list-reconcile-granular.ts` to apply
 * an `update` patch in place via attribute + child morphing instead of
 * `replaceChild` discarding the whole subtree. Same short-circuits as
 * `morph()`: `data-morph-skip`, `data-morph-skip-children`, `isEqualNode`,
 * focused contenteditable / text-entry preservation. Tag mismatch falls
 * through to the same parent.replaceChild fallback the public API uses.
 *
 * Underscore-prefixed export (not part of the public API surface). Public
 * callers should use `morph(liveRoot, template)`.
 */
export function _morphElement(
  fromEl: Element,
  toEl: Element,
  ownedItems: ReadonlySet<Element> = EMPTY_OWNED,
): void {
  morphElement(fromEl, toEl, ownedItems);
}

function isElementNode(t: Element | SafeHtml | string): t is Element {
  return typeof t === 'object' && t !== null
    && (t as Node).nodeType === ELEMENT_NODE;
}

function parseTemplate(liveRoot: Element, template: SafeHtml | string): Element {
  const el = liveRoot.cloneNode(false) as Element;
  el.innerHTML = String(template);
  return el;
}

/**
 * A canonical tag for the ways a live node is managed OUTSIDE the template, so
 * the positional diff must not repurpose it as some other element.
 *
 * Three attributes make a node "something else": `data-morph-skip` and
 * `data-morph-skip-children` mark a library-owned subtree, and
 * `data-morph-preserve` marks a node imperatively injected after render that
 * the template never emits. Steps 2 and 2.5 require this tag to be EQUAL on
 * both sides before pairing — so a template element carrying no such claim
 * never adopts a protected live node (it gets inserted fresh beside it), and a
 * protected live node pairs only with a template that declares the same
 * protection, i.e. it genuinely is that same widget across both renders.
 *
 * The keyed match (step 1) is unaffected: a protected node WITH an `id`/
 * `data-key` the template also emits still matches and morphs in place, which
 * is the "attrs morph if matched" the docs describe. This gate only governs the
 * *positional* fallback, where "matched" would otherwise mean "happened to sit
 * at the same index as an unrelated template element".
 */
function protectionTag(node: Node): string {
  // Both call sites (step 2's element arm and step 2.5's element scan) only ever
  // reach here with an element, so `dataset` is always present — no non-element
  // guard, which would be an unreachable branch.
  const { dataset } = node as HTMLElement;
  return (dataset.morphSkip !== undefined ? 's' : '')
    + (dataset.morphSkipChildren !== undefined ? 'c' : '')
    + (dataset.morphPreserve !== undefined ? 'p' : '');
}

const MARKER_PREFIXES = [LIST_MARKER_PREFIX, TEXT_MARKER_PREFIX, ROW_TEXT_PREFIX];

/** True when `node` is a kerf anchor comment (list marker or binding marker). */
function isMarker(node: Node): boolean {
  if (node.nodeType !== COMMENT_NODE) return false;
  const { data } = node as Comment;
  return MARKER_PREFIXES.some((prefix) => data.startsWith(prefix));
}

/**
 * Whether two nodes may be positionally paired as far as kerf's markers are
 * concerned. Elements and text carry no marker state, so they defer entirely to
 * the tag/key checks in the caller — this only constrains comments.
 *
 * A kerf marker comment (`kf-list:` / `kfb:` / `kfbr:`) is the comment
 * equivalent of a keyed element: it anchors live state — a list's rows, a bound
 * hole's inserted text node — that exists only in the DOM and is looked up by
 * the marker's EXACT data. So a marker pairs positionally only with the
 * identical marker, never with a different one.
 *
 * The reason is `morphNode`: pairing two mismatched comments overwrites the
 * live one's data (`from.data = to.data`), which re-points one list/binding's
 * anchor at another's id. Two shapes it produced, both silent:
 *
 *  - a list marker paired with a text-binding marker (different KINDS) carried
 *    the binding's inserted text node into the list — the value rendered twice.
 *  - a list marker paired with a DIFFERENT list marker (same kind) — an empty
 *    conditional list reappearing next to a sibling list overwrote the
 *    sibling's marker id, so the sibling's binding could no longer find its own
 *    marker and its whole row region emptied on the next reconcile.
 *
 * Ordinary comments carry no state and stay positionally matched (their data
 * just morphs), so a consumer's `<!-- … -->` is unaffected.
 */
function markersPairable(a: Node, b: Node): boolean {
  if (!isMarker(a) && !isMarker(b)) return true;
  return (a as CharacterData).data === (b as CharacterData).data;
}

/**
 * Advance past any owned (list-reconciler-managed) element. Owned items
 * stay put across morphs — they're invisible to the morph's child cursor.
 */
function skipOwned(node: Node | null, ownedItems: ReadonlySet<Element>): Node | null {
  while (node !== null && node.nodeType === ELEMENT_NODE
      && ownedItems.has(node as Element)) {
    node = node.nextSibling;
  }
  return node;
}

function isListMarker(node: Node): boolean {
  return node.nodeType === COMMENT_NODE
    && (node as Comment).data.startsWith(LIST_MARKER_PREFIX);
}

/**
 * The node just PAST a list's row region — an exclusive end, `null` at the end
 * of the parent. The region runs from the marker through its last owned row;
 * when the list is empty that's the marker alone. Nodes sitting BETWEEN rows
 * (something the consumer injected imperatively) are inside the region, so the
 * region is "marker through last row," not "the contiguous run of owned rows"
 * (KF-385 — the contiguous reading let one interloper shrink the region to the
 * bare marker).
 *
 * The scan stops at the next list's marker so a sibling `each()` in the same
 * parent is never absorbed into this one's region.
 */
function afterListRegion(marker: Comment, ownedItems: ReadonlySet<Element>): Node | null {
  let last: Node = marker;
  for (let r: Node | null = marker.nextSibling; r !== null; r = r.nextSibling) {
    if (isListMarker(r)) break;
    if (r.nodeType === ELEMENT_NODE && ownedItems.has(r as Element)) last = r;
  }
  return last.nextSibling;
}

function morphChildren(
  fromParent: Element,
  toParent: Element,
  ownedItems: ReadonlySet<Element>,
): void {
  // Build a keyed lookup from the live children so we can match by key
  // even after reorders. Owned items don't participate in keyed matching
  // (they're not visible to the morph).
  const keyed = new Map<string, Element>();
  for (let c = fromParent.firstChild; c !== null; c = c.nextSibling) {
    if (c.nodeType === ELEMENT_NODE && ownedItems.has(c as Element)) continue;
    const k = getNodeKey(c);
    if (k !== undefined) keyed.set(k, c as Element);
  }

  let fromChild: Node | null = skipOwned(fromParent.firstChild, ownedItems);
  let toChild: Node | null = toParent.firstChild;

  while (toChild !== null) {
    const toNext = toChild.nextSibling;
    let matched: Node | null = null;

    // 1. Try key match.
    const toKey = getNodeKey(toChild);
    if (toKey !== undefined && keyed.has(toKey)) {
      matched = keyed.get(toKey) as Element;
      keyed.delete(toKey);
      if (matched !== fromChild) {
        fromParent.insertBefore(matched, fromChild);
      } else {
        fromChild = skipOwned(fromChild.nextSibling, ownedItems);
      }
    }

    // 2. Fall back to positional match — same nodeType, same tag (for
    //    elements), and NEITHER side carries a key. A key on either side is a
    //    statement of identity, so it must be honored in both directions:
    //
    //    - live keyed: matches by key only, never positionally, so reorders
    //      work rather than churning whatever happens to sit at the index.
    //    - template keyed: step 1 already looked for its key among the live
    //      children and didn't find it, so the element the template is asking
    //      for is genuinely not here. Adopting an unkeyed same-tag neighbour
    //      instead repurposes a node that is something else, and the rules that
    //      protect a node's contents (`data-morph-skip`, `data-morph-preserve`,
    //      a binding marker's inserted text node) then keep the wrong contents
    //      alive inside it: a skipped widget swallows the element and gets
    //      duplicated, a preserved child ends up under a foreign host, a bound
    //      hole's text leaks. Those rules are each right; the pairing was not.
    if (matched === null && fromChild !== null
        && fromChild.nodeType === toChild.nodeType
        && markersPairable(fromChild, toChild)
        && (toChild.nodeType !== ELEMENT_NODE
            || ((fromChild as Element).tagName === (toChild as Element).tagName
                && getNodeKey(fromChild) === undefined
                && toKey === undefined
                && protectionTag(fromChild) === protectionTag(toChild)))) {
      matched = fromChild;
      // KF-385: a matched list marker carries its whole row region, so the
      // cursor must land AFTER the last row — not merely after the contiguous
      // owned run. Stopping at an interloper between rows parks the cursor
      // inside the list, where the next template sibling would be inserted
      // (a trailing <button> landing amongst the rows).
      fromChild = skipOwned(
        isListMarker(matched)
          ? afterListRegion(matched as Comment, ownedItems)
          : fromChild.nextSibling,
        ownedItems,
      );
      // KF-374: a binding marker comment OWNS the text node the wiring pass
      // inserted right after it — the template never contains that node
      // (templates carry only the marker). Step the cursor past it so a
      // template static sibling pairs with its real live counterpart instead
      // of the inserted node; behind the cursor, the inserted node also
      // survives the trailing-removal pass.
      if (matched.nodeType === COMMENT_NODE && fromChild !== null) {
        const owned = boundTextNodeOf(matched as Comment);
        if (owned !== null && fromChild === owned) {
          fromChild = skipOwned(owned.nextSibling, ownedItems);
        }
      }
    }

    // 2.5. Positional lookahead (KF-377: removing a conditional sibling ahead
    //    of a keyed list must not rebuild the list's container). The
    //    positional match failed, but the real counterpart may sit further
    //    along the live children — the common case is a conditional element
    //    this render removed, shifting everything after it one slot left.
    //    Without this, the shifted element is cloned from scratch and the
    //    original is dropped by the trailing-removal pass — catastrophic when
    //    it (or a descendant) hosts an each() marker, whose ListBinding would
    //    detach permanently. Scan forward for the first same-tag unkeyed
    //    element and move it up, exactly the move the keyed branch performs;
    //    skipped-over live nodes stay behind the cursor for later template
    //    children or the trailing-removal pass. Elements only: comments/text
    //    are stateless to rebuild, and binding-marker comments own an
    //    inserted text sibling that must never be separated by a move. The
    //    ONE comment exception is the each() list marker — see 2.6.
    //    Keyed template elements are excluded for the same reason as step 2:
    //    step 1 already searched every live child for that key, so moving up an
    //    unkeyed stranger would repurpose a node that is something else.
    if (matched === null && toChild.nodeType === ELEMENT_NODE && fromChild !== null
        && toKey === undefined) {
      const toTag = (toChild as Element).tagName;
      for (let scan: Node | null = fromChild.nextSibling; scan !== null; scan = scan.nextSibling) {
        if (scan.nodeType !== ELEMENT_NODE) continue;
        const el = scan as Element;
        if (ownedItems.has(el)) continue;
        if (el.tagName !== toTag || getNodeKey(el) !== undefined) continue;
        if (protectionTag(el) !== protectionTag(toChild)) continue;
        matched = el;
        fromParent.insertBefore(el, fromChild);
        break;
      }
    }

    // 2.6. Marker-aware lookahead (KF-382: a sibling that shifts an each()
    //    list's begin-anchor must not cost the rows their DOM identity). A
    //    `kf-list:` comment is the one comment kind that is NOT stateless to
    //    rebuild: it anchors a ListBinding, and its rows exist only in the live
    //    tree (the template carries the bare marker). Cloning it instead of
    //    moving it detaches the binding, so mount() self-heals by re-creating
    //    every row — correct, but focus / scroll / IME / listeners are lost.
    //    Scan forward for the SAME marker (matched on exact data, so sibling
    //    lists in one parent can't cross-match) and move it up. The marker
    //    travels WITH its whole row region: moving it alone would let a later
    //    template sibling (a trailing <button>, say) match ahead of the rows
    //    and wedge itself between the anchor and the rows it anchors.
    if (matched === null && fromChild !== null
        && toChild.nodeType === COMMENT_NODE
        && (toChild as Comment).data.startsWith(LIST_MARKER_PREFIX)) {
      const wantData = (toChild as Comment).data;
      for (let scan: Node | null = fromChild.nextSibling; scan !== null; scan = scan.nextSibling) {
        if (scan.nodeType !== COMMENT_NODE || (scan as Comment).data !== wantData) continue;
        // The run is the marker through its LAST owned row — interlopers in
        // between travel along (KF-385). Stopping at the first non-owned node
        // instead would truncate the run to the bare marker the moment anything
        // sat between the anchor and the rows (an imperatively-injected
        // `data-morph-preserve` node, say), silently reintroducing the unsafe
        // move-alone variant. Carrying interlopers also keeps them where the
        // consumer put them, relative to the list.
        const regionEnd = afterListRegion(scan as Comment, ownedItems);
        const run: Node[] = [];
        for (let r: Node | null = scan; r !== null && r !== regionEnd; r = r.nextSibling) {
          run.push(r);
        }
        // Some engines (older Safari, happy-dom) blur a focused descendant on
        // `insertBefore` even though the node survives the move connected —
        // the same quirk the list reconciler's move pass handles. Preserving
        // row identity is only half the promise; the caret has to survive too.
        const focusSnap = captureFocus(fromParent);
        for (const node of run) fromParent.insertBefore(node, fromChild);
        if (focusSnap !== null) restoreFocus(focusSnap);
        matched = scan;
        break;
      }
    }

    if (matched !== null) {
      morphNode(matched, toChild, ownedItems);
    } else {
      // 3. No match — clone the new node and insert before fromChild
      //    (which may be an owned item we deliberately stopped at; that's
      //    fine — `insertBefore(node, ownedItem)` slots the new sibling
      //    in immediately before the list region).
      const cloned = toChild.cloneNode(true);
      fromParent.insertBefore(cloned, fromChild);
    }

    toChild = toNext;
  }

  // 4. Anything past the cursor is unmatched — remove, except for owned
  //    items (those stay; they belong to a list reconciler) and elements
  //    marked `data-morph-preserve` (KF-151 — imperatively-injected nodes
  //    whose lifetime the consumer manages outside kerf).
  while (fromChild !== null) {
    const next = fromChild.nextSibling;
    if (fromChild.nodeType === ELEMENT_NODE) {
      const el = fromChild as Element;
      if (!ownedItems.has(el)
          && (el as HTMLElement).dataset.morphPreserve === undefined) {
        fromParent.removeChild(fromChild);
      }
    } else {
      fromParent.removeChild(fromChild);
    }
    fromChild = next;
  }
}

function morphNode(
  fromNode: Node,
  toNode: Node,
  ownedItems: ReadonlySet<Element>,
): void {
  if (fromNode.nodeType === ELEMENT_NODE) {
    morphElement(fromNode as Element, toNode as Element, ownedItems);
    return;
  }
  if (fromNode.nodeType === TEXT_NODE || fromNode.nodeType === COMMENT_NODE) {
    const fromText = fromNode as CharacterData;
    const toText = toNode as CharacterData;
    if (fromText.data !== toText.data) fromText.data = toText.data;
  }
}

function morphElement(
  fromEl: Element,
  toEl: Element,
  ownedItems: ReadonlySet<Element>,
): void {
  if (fromEl.tagName !== toEl.tagName) {
    const replacement = toEl.cloneNode(true);
    fromEl.parentNode?.replaceChild(replacement, fromEl);
    return;
  }
  // 1. Library-owned subtree — leave verbatim.
  if ((fromEl as HTMLElement).dataset.morphSkip !== undefined) return;
  // 2. Byte-identical — nothing to do.
  if (fromEl.isEqualNode(toEl)) return;
  // 3. Focused contenteditable — preserve user's in-progress edit.
  if (fromEl === document.activeElement) {
    const ce = fromEl.getAttribute('contenteditable');
    if (ce !== null && ce.toLowerCase() !== 'false') return;
    if (isTextInputOrTextarea(fromEl)) preserveTextEntryState(fromEl, toEl);
  }
  morphAttributes(fromEl, toEl);
  // 4. Subtree-only skip (KF-152) — attributes have already morphed; leave
  //    the children alone. Use for client-hydrated slots whose loading /
  //    state classes still need to flow through.
  if ((fromEl as HTMLElement).dataset.morphSkipChildren !== undefined) return;
  // KF-335: a TEXTAREA's value lives in its child text, and the dirty-value
  // flag detaches the property once the user (or script) has touched it.
  // When the template's text genuinely differs — a template-driven change,
  // detected BEFORE the child morph rewrites the live text — carry the
  // property along after the morph. A focused textarea keeps the user's
  // in-progress edit (same exception as the input `value` sync), and an
  // unchanged template leaves a dirty textarea untouched (uncontrolled
  // usage preserved).
  const syncTextareaValue = fromEl.tagName === 'TEXTAREA'
    && fromEl !== document.activeElement
    && fromEl.textContent !== toEl.textContent;
  // 5. Recurse into children. List items inside `fromEl` (if any) are
  //    skipped via `ownedItems` inside morphChildren — list reconciler
  //    owns them — but non-list siblings are still morphed.
  morphChildren(fromEl, toEl, ownedItems);
  if (syncTextareaValue) {
    // `textContent` is only null for Document/DocumentType nodes — for an
    // element it's always a string, so the cast avoids an unreachable `?? ''`
    // branch under the coverage gate.
    (fromEl as HTMLTextAreaElement).value = toEl.textContent as string;
  }
}

/**
 * Attributes the user agent toggles in response to user interaction.
 * `<details>` and `<dialog>` add/remove `open=""` themselves when the user
 * expands or closes the element. If the developer's JSX never mentions
 * `open`, treating that attribute as user-agent-owned and leaving it alone
 * during the morph keeps the user-driven state intact across re-renders.
 *
 * Trade-off (KF-84): controlled-style `<details open={signal.value}>` where
 * the signal flips false won't auto-collapse the element, because the
 * morph's remove pass no longer reaches `open`. Apps that need controlled
 * behavior should drive `open` imperatively (e.g. `el.removeAttribute('open')`
 * inside an action) or wrap with a state-toggle pattern. The uncontrolled
 * case is the common one and the one that was silently broken before.
 */
function isUserAgentOwnedAttr(tagName: string, name: string): boolean {
  return name === 'open' && (tagName === 'DETAILS' || tagName === 'DIALOG');
}

function morphAttributes(fromEl: Element, toEl: Element): void {
  // Set/update every attribute on toEl.
  const toAttrs = toEl.attributes;
  for (let i = 0; i < toAttrs.length; i++) {
    const attr = toAttrs[i];
    const ns = attr.namespaceURI;
    const name = attr.localName;
    const value = attr.value;
    if (ns !== null) {
      if (fromEl.getAttributeNS(ns, name) !== value) {
        fromEl.setAttributeNS(ns, attr.name, value);
      }
    } else if (fromEl.getAttribute(name) !== value) {
      fromEl.setAttribute(name, value);
      // KF-335: a mutated checked/value/selected attribute must carry the live
      // property with it — after user interaction the dirty flag detaches the
      // property from the attribute, so an attribute-only write leaves the
      // visible state stale. Sync happens ONLY on actual attribute mutation,
      // so uncontrolled elements (JSX never mentions the attr) stay untouched.
      syncFormProp(fromEl, name, value, true);
    }
  }
  // Remove attributes that are no longer present on toEl.
  const fromAttrs = fromEl.attributes;
  const fromTag = fromEl.tagName;
  for (let i = fromAttrs.length - 1; i >= 0; i--) {
    const attr = fromAttrs[i];
    const ns = attr.namespaceURI;
    const name = attr.localName;
    if (ns !== null) {
      if (!toEl.hasAttributeNS(ns, name)) fromEl.removeAttributeNS(ns, name);
    } else if (!toEl.hasAttribute(name) && !isUserAgentOwnedAttr(fromTag, name)) {
      fromEl.removeAttribute(name);
      // KF-335: removed checked/value/selected attr → property follows (see
      // the set-side comment above).
      syncFormProp(fromEl, name, '', false);
    }
  }
}

function isTextInputOrTextarea(el: Element): boolean {
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return type === 'text' || type === 'search' || type === 'url' || type === 'email'
      || type === 'tel' || type === 'password' || type === '';
  }
  return false;
}

function preserveTextEntryState(fromEl: Element, toEl: Element): void {
  if (fromEl.tagName === 'TEXTAREA' || fromEl.tagName === 'INPUT') {
    const fromInput = fromEl as HTMLInputElement;
    const toInput = toEl as HTMLInputElement;
    toInput.value = fromInput.value;
    try {
      toInput.setSelectionRange(fromInput.selectionStart, fromInput.selectionEnd);
    } catch {
      // Some input types (number, range, color, …) reject selection APIs.
    }
  }
}
