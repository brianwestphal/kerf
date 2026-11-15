import { realmOf } from '../../../../shared/dom/realm.js';

const RESULT = '.kui-search-field__result';
const LIVE = ':scope > .kui-search-field__result-live';

/** Quiet time after a readout change before it is announced. */
export const SEARCH_RESULT_ANNOUNCE_DELAY = 500;

/**
 * KF-8CDT8B: announce a SearchField's `resultText` readout politely. A find
 * readout changes on every keystroke ("1 of 40", "1 of 12", "1 of 3"), so the
 * readout itself is not the live region: each change restarts a short quiet
 * period, and only the text that settles is copied into the field's
 * component-owned live region (`data-morph-skip`, so application renders
 * never overwrite it). A readout that settles back to the text last
 * announced says nothing.
 */
export function watchSearchFieldResults(root: HTMLElement): () => void {
  const realm = realmOf(root);
  const timers = new Map<HTMLElement, number>();

  const announce = (field: HTMLElement) => {
    timers.delete(field);
    const live = field.querySelector<HTMLElement>(LIVE);
    if (!live) return;
    const result = field.querySelector<HTMLElement>(`:scope > ${RESULT}`);
    const text =
      field.dataset.placeholderVisible === 'true'
        ? ''
        : (result?.textContent ?? '').trim();
    if (live.textContent !== text) live.textContent = text;
  };
  const schedule = (field: HTMLElement) => {
    const pending = timers.get(field);
    if (pending !== undefined) realm.clearTimeout(pending);
    timers.set(
      field,
      realm.setTimeout(() => announce(field), SEARCH_RESULT_ANNOUNCE_DELAY),
    );
  };
  const fieldOf = (node: Node | null): HTMLElement | null => {
    const element =
      node?.nodeType === 1 ? (node as Element) : (node?.parentElement ?? null);
    const result = element?.closest(RESULT);
    return result?.parentElement ?? null;
  };

  const observer = new realm.MutationObserver((records) => {
    const fields = new Set<HTMLElement>();
    for (const record of records) {
      const field = fieldOf(record.target);
      if (field) fields.add(field);
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        const element = node as Element;
        if (element.matches(RESULT)) fields.add(element.parentElement!);
        for (const nested of element.querySelectorAll(RESULT))
          fields.add(nested.parentElement!);
      }
    }
    for (const field of fields) schedule(field);
  });
  observer.observe(root, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();
    for (const timer of timers.values()) realm.clearTimeout(timer);
    timers.clear();
  };
}
