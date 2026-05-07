/**
 * `mount(rootEl, render)` — kerf's render primitive.
 *
 * Wraps `effect()` from `reactive.ts` so that whenever any signal read inside
 * `render()` changes, we re-run `render()` and use `morphdom` to apply the
 * minimal set of DOM mutations against the live tree. Element identity (and
 * thus focus, selection, in-flight pointer interactions, and event listeners
 * on preserved nodes) is preserved wherever the keyed/positional diff matches.
 *
 * Compared to a `replaceChildren(...rows.map(toElement))` rebuild pattern, the
 * user-visible win is that an `<input>` the user is typing into survives an
 * unrelated re-render — its DOM node, focus state, and cursor position are
 * not destroyed and recreated on each tick.
 */

import morphdom from 'morphdom';

import type { SafeHtml } from './jsx-runtime.js';
import { isSafeHtml } from './jsx-runtime.js';
import { effect } from './reactive.js';

// Distinct namespaces inside morphdom's flat string-keyed match space, so a
// consumer with `id="foo"` and a sibling with `data-key="foo"` cannot collide.
// The prefixes also can't collide with each other across consumer values
// (e.g. `id="data-key:foo"` vs `data-key="foo"` would have produced the same
// key under a single-prefix scheme; here they don't).
const ID_KEY_PREFIX = 'id:';
const DATA_KEY_PREFIX = 'data-key:';

/**
 * Bind `render()` to the children of `rootEl`. Re-runs whenever any signal
 * read inside `render()` changes. Returns a disposer that tears down the
 * effect; call it when the host element is removed from the DOM.
 *
 * Conventions:
 *
 * - Diff keys: `id` and `data-key` are matched across the morph by key
 *   rather than positionally, so list reorders move existing nodes instead
 *   of churning unrelated siblings.
 * - `data-morph-skip`: any element with this attribute is left untouched
 *   inside on subsequent renders. Used for library-owned subtrees (xterm-
 *   style widgets, charts, third-party editors) where the library's own
 *   lifecycle manages the children.
 * - Focused text-entry inputs (`<input>` of typing kinds, `<textarea>`)
 *   keep their current value + selection range across morphs while focused.
 *   The user never sees their cursor jump mid-keystroke.
 * - Focused `[contenteditable]` elements have their entire subtree
 *   skipped (same mechanism as `data-morph-skip`). The user's in-progress
 *   edit — typed content, caret position, multi-range selections, anything
 *   else they did to the DOM — survives verbatim. The next render after
 *   blur catches up.
 */
export function mount(rootEl: HTMLElement, render: () => SafeHtml | string): () => void {
  return effect(() => {
    const next = render();
    const html = isSafeHtml(next) ? next.toString() : next;

    const template = rootEl.cloneNode(false) as HTMLElement;
    template.innerHTML = html;

    morphdom(rootEl, template, {
      childrenOnly: true,
      getNodeKey: (node) => {
        if (node.nodeType !== 1) return undefined;
        const el = node as HTMLElement;
        if (el.id !== '') return `${ID_KEY_PREFIX}${el.id}`;
        if (el.dataset.key != null) return `${DATA_KEY_PREFIX}${el.dataset.key}`;
        return undefined;
      },
      onBeforeElUpdated: (fromEl, toEl) => {
        if (fromEl.dataset.morphSkip != null) return false;
        if (fromEl.isEqualNode(toEl)) return false;
        if (fromEl === document.activeElement) {
          // Focused contenteditable: skip the entire subtree so the user's
          // in-progress edit (typed content + caret + multi-range selection)
          // is not disturbed. A subsequent render — typically after blur or
          // an explicit signal write — catches up. We read the attribute
          // directly rather than the derived `isContentEditable` property
          // because happy-dom (test environment) doesn't always populate
          // the latter; the attribute is the spec's source of truth either
          // way. Per the HTML spec, any value other than `"false"` (case-
          // insensitive), including the empty string, means editable.
          const ce = fromEl.getAttribute('contenteditable');
          if (ce !== null && ce.toLowerCase() !== 'false') return false;
          // Focused INPUT / TEXTAREA: copy live value + selection onto the
          // morph target before letting morphdom proceed.
          if (isTextInputOrTextarea(fromEl)) preserveTextEntryState(fromEl, toEl);
        }
        return true;
      },
    });
  });
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

function preserveTextEntryState(fromEl: HTMLElement, toEl: HTMLElement): void {
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
