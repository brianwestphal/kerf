import { realmOf } from '../../../../shared/dom/realm.js';

const RESULT = '.kui-search-field__result';
const LIVE = ':scope > .kui-search-field__result-live';
const EDITOR = ':scope > .kui-search-field__editor';

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
 *
 * KF-H3PNKB: the editor is `data-morph-skip`, so its `aria-describedby` only
 * names the readout when `resultText` was defined as the editor was created.
 * The watcher adds the readout's id when a readout appears in an existing
 * field and removes it when the readout leaves, keeping any other ids (the
 * form-field hint).
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
  const describe = (field: HTMLElement, id: string) => {
    const editor = field.querySelector<HTMLElement>(EDITOR);
    if (!editor) return;
    const present = field.querySelector(`:scope > ${RESULT}`)?.id === id;
    const ids = (editor.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((token) => token && token !== id);
    if (present) ids.push(id);
    if (ids.length) editor.setAttribute('aria-describedby', ids.join(' '));
    else editor.removeAttribute('aria-describedby');
  };
  const fieldOf = (node: Node | null): HTMLElement | null => {
    const element =
      node?.nodeType === 1 ? (node as Element) : (node?.parentElement ?? null);
    const result = element?.closest(RESULT);
    return result?.parentElement ?? null;
  };

  const observer = new realm.MutationObserver((records) => {
    const fields = new Set<HTMLElement>();
    const described = new Map<HTMLElement, Set<string>>();
    const note = (field: HTMLElement, id: string) => {
      if (!id) return;
      const ids = described.get(field) ?? new Set<string>();
      described.set(field, ids.add(id));
    };
    for (const record of records) {
      const field = fieldOf(record.target);
      if (field) fields.add(field);
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        const element = node as Element;
        // A node added and removed again in one batch has no parent.
        const parent = element.parentElement;
        if (parent && element.matches(RESULT)) {
          note(parent, element.id);
          fields.add(parent);
        }
        for (const nested of element.querySelectorAll(RESULT))
          fields.add(nested.parentElement!);
      }
      for (const node of record.removedNodes) {
        const element = node as Element;
        if (node.nodeType === 1 && element.matches(RESULT))
          note(record.target as HTMLElement, element.id);
      }
    }
    // Settle on each field's final state: a morph that swaps the readout
    // node reports both a removal and an addition.
    for (const [field, ids] of described)
      for (const id of ids) describe(field, id);
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
