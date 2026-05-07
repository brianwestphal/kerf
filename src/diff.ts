/**
 * `diff(liveRoot, templateRoot, listParents)` — minimum-mutation DOM
 * reconciliation.
 *
 * Replaces our previous dependency on `morphdom`. The algorithm is the
 * classic two-tree walk: match children by key (id, then data-key, then
 * positional same-tag), morph matches in place, insert / remove / clone
 * the rest. Specialised for what kerf needs:
 *
 * - `childrenOnly` is always true; the live root is never replaced.
 * - Three short-circuit paths on each element:
 *     1. `data-morph-skip`: subtree is library-owned, leave verbatim.
 *     2. `isEqualNode`: subtree is byte-identical, no work needed.
 *     3. `listParents` membership: a kerf list reconciler owns this
 *        element's children, so we morph attributes only and stop.
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
 * `templateRoot`. `listParents` is the set of live elements whose children
 * are managed by `each()`'s reconciler — they get attribute morphing but
 * not children diffing.
 */
export function diff(
  liveRoot: Element,
  templateRoot: Element,
  listParents: ReadonlySet<Element>,
): void {
  diffChildren(liveRoot, templateRoot, listParents);
}

function diffChildren(
  fromParent: Element,
  toParent: Element,
  listParents: ReadonlySet<Element>,
): void {
  // Build a keyed lookup from the live children so we can match by key
  // even after reorders.
  const keyed = new Map<string, Element>();
  for (let c = fromParent.firstChild; c !== null; c = c.nextSibling) {
    const k = getNodeKey(c);
    if (k !== undefined) keyed.set(k, c as Element);
  }

  let fromChild: Node | null = fromParent.firstChild;
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
        fromChild = fromChild.nextSibling;
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
      fromChild = fromChild.nextSibling;
    }

    if (matched !== null) {
      morphNode(matched, toChild, listParents);
    } else {
      // 3. No match — clone the new node and insert.
      const cloned = toChild.cloneNode(true);
      fromParent.insertBefore(cloned, fromChild);
    }

    toChild = toNext;
  }

  // 4. Anything past the cursor is unmatched — remove. Any keyed node that
  //    wasn't matched in the toParent walk falls into this trailing range
  //    by construction (matched keyed nodes get moved before the cursor;
  //    unmatched ones stay at or after it), so we don't need a separate
  //    orphan pass.
  while (fromChild !== null) {
    const next = fromChild.nextSibling;
    fromParent.removeChild(fromChild);
    fromChild = next;
  }
}

function morphNode(
  fromNode: Node,
  toNode: Node,
  listParents: ReadonlySet<Element>,
): void {
  if (fromNode.nodeType === ELEMENT_NODE) {
    morphElement(fromNode as Element, toNode as Element, listParents);
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
  listParents: ReadonlySet<Element>,
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
  // 4. List parent — its children are managed by the each() reconciler;
  //    diff stops here. We still ran morphAttributes above, so attribute
  //    changes on the parent itself (id, class, data-* …) propagate.
  if (listParents.has(fromEl)) return;
  diffChildren(fromEl, toEl, listParents);
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
  for (let i = fromAttrs.length - 1; i >= 0; i--) {
    const attr = fromAttrs[i];
    const ns = attr.namespaceURI;
    const name = attr.localName;
    if (ns !== null) {
      if (!toEl.hasAttributeNS(ns, name)) fromEl.removeAttributeNS(ns, name);
    } else if (!toEl.hasAttribute(name)) {
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
