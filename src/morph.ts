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

import { boundTextNodeOf } from './bindings.js';
import type { SafeHtml } from './jsx-runtime.js';
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
  morphChildren(liveRoot, templateEl, ownedItems);
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
    //    elements), and the live node has no key (a keyed node only
    //    matches by key, never positionally, so reorders work).
    if (matched === null && fromChild !== null
        && fromChild.nodeType === toChild.nodeType
        && (toChild.nodeType !== ELEMENT_NODE
            || ((fromChild as Element).tagName === (toChild as Element).tagName
                && getNodeKey(fromChild) === undefined))) {
      matched = fromChild;
      fromChild = skipOwned(fromChild.nextSibling, ownedItems);
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
    //    inserted text sibling that must never be separated by a move.
    if (matched === null && toChild.nodeType === ELEMENT_NODE && fromChild !== null) {
      const toTag = (toChild as Element).tagName;
      for (let scan: Node | null = fromChild.nextSibling; scan !== null; scan = scan.nextSibling) {
        if (scan.nodeType !== ELEMENT_NODE) continue;
        const el = scan as Element;
        if (ownedItems.has(el)) continue;
        if (el.tagName !== toTag || getNodeKey(el) !== undefined) continue;
        matched = el;
        fromParent.insertBefore(el, fromChild);
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
