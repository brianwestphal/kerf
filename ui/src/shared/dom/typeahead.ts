// KF-NF65PK: the one typeahead contract Select and PopupMenu share (they are
// one popup with one keyboard contract), so the two cannot drift again.

/** A typeahead query resets after this long without a keystroke. */
export const TYPEAHEAD_RESET = 1000;

/**
 * The words of `item`'s label element, or of the whole item when it has no
 * such element (hand-authored markup, or a custom render without the label
 * span), whitespace-collapsed and trimmed. Never throws on missing markup.
 */
export function itemLabel(item: Element, labelSelector: string): string {
  const label = item.querySelector(labelSelector) ?? item;
  return (label.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Typeahead over the items of many popups, one query per popup. */
export interface Typeahead {
  /** The popup's query underway, or `''`. */
  query(owner: Element): string;
  /**
   * Extend `owner`'s query with `key` (a printable character; `Backspace`
   * removes the last one) and restart its reset timer, then return the first
   * of `items` whose label starts with the query, case-insensitively. A
   * Backspace on an empty query, or one that empties it, matches nothing.
   */
  type<T extends Element>(
    owner: Element,
    key: string,
    items: readonly T[],
    labelOf: (item: T) => string,
  ): T | undefined;
}

/** Create typeahead state whose reset timers run on `view`. */
export function createTypeahead(view: Window): Typeahead {
  const states = new WeakMap<
    Element,
    { query: string; timer: number | undefined }
  >();
  return {
    query: (owner) => states.get(owner)?.query ?? '',
    type(owner, key, items, labelOf) {
      const state = states.get(owner) ?? { query: '', timer: undefined };
      states.set(owner, state);
      view.clearTimeout(state.timer);
      state.timer = view.setTimeout(() => {
        state.query = '';
      }, TYPEAHEAD_RESET);
      state.query =
        key === 'Backspace'
          ? state.query.slice(0, -1)
          : state.query + key.toLowerCase();
      if (!state.query) return undefined;
      return items.find((item) =>
        labelOf(item).toLowerCase().startsWith(state.query),
      );
    },
  };
}
