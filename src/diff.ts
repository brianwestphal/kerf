/**
 * `diff(liveRoot, templateRoot, ownedItems)` — minimum-mutation DOM
 * reconciliation.
 *
 * Replaces our previous dependency on `morphdom`. The algorithm is the
 * classic two-tree walk: match children by key (id, then data-key, then
 * positional same-tag), morph matches in place, insert / remove / clone
 * the rest. Specialised for what kerf needs:
 *
 * - `childrenOnly` is always true; the live root is never replaced.
 * - Per-element short-circuits: `data-morph-skip` (library-owned, leave
 *   verbatim) and `isEqualNode` (byte-identical, no work needed).
 * - **`ownedItems`** is the set of element nodes owned by an `each()`
 *   list reconciler. The diff skips them in every children walk —
 *   they're not added to the keyed-lookup map, the from-cursor advances
 *   past them, and the trailing-removal pass leaves them in place. This
 *   lets each() coexist with non-list siblings inside the same parent
 *   (KF-102 round 2): the diff still walks the parent's children to
 *   reconcile siblings, but never disturbs list rows.
 * - Focused text inputs (`<input>`/`<textarea>`) keep their value +
 *   selection across the morph; focused `[contenteditable]` keeps its
 *   entire subtree (typed content + caret + multi-range selection).
 *
 * Algorithm credit: based on the design of
 * https://github.com/patrick-steele-idem/morphdom by Patrick Steele-Idem
 * (MIT licensed). Reimplemented here so kerf can specialise the hot paths
 * (segment-aware list dispatch, lighter callback surface) and drop the
 * runtime dependency. Original copyright preserved in `LICENSE`.
 */

const ID_KEY_PREFIX = 'id:';
const DATA_KEY_PREFIX = 'data-key:';
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

/**
 * Reconcile the children of `liveRoot` to match the children of
 * `templateRoot`. `ownedItems` is the set of element nodes owned by `each()`
 * list reconcilers — the diff skips them in every children walk.
 */
export function diff(
  liveRoot: Element,
  templateRoot: Element,
  ownedItems: ReadonlySet<Element>,
): void {
  diffChildren(liveRoot, templateRoot, ownedItems);
}

/**
 * Advance past any owned (list-reconciler-managed) element. Owned items
 * stay put across diffs — they're invisible to the diff's child cursor.
 */
function skipOwned(node: Node | null, ownedItems: ReadonlySet<Element>): Node | null {
  while (node !== null && node.nodeType === ELEMENT_NODE
      && ownedItems.has(node as Element)) {
    node = node.nextSibling;
  }
  return node;
}

function diffChildren(
  fromParent: Element,
  toParent: Element,
  ownedItems: ReadonlySet<Element>,
): void {
  // Build a keyed lookup from the live children so we can match by key
  // even after reorders. Owned items don't participate in keyed matching
  // (they're not visible to the diff).
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
  //    items (those stay; they belong to a list reconciler).
  while (fromChild !== null) {
    const next = fromChild.nextSibling;
    if (fromChild.nodeType !== ELEMENT_NODE
        || !ownedItems.has(fromChild as Element)) {
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
  // 4. Recurse into children. List items inside `fromEl` (if any) are
  //    skipped via `ownedItems` inside diffChildren — list reconciler
  //    owns them — but non-list siblings are still diffed.
  diffChildren(fromEl, toEl, ownedItems);
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
 * behaviour should drive `open` imperatively (e.g. `el.removeAttribute('open')`
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
