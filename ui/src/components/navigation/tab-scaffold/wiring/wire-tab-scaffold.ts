import { delegate } from 'kerfjs';

export interface WireTabScaffoldOptions {
  /** Invoked with the selected tab id when a bottom-bar tab is activated. */
  onSelect: (tabId: string) => void;
}

/**
 * Wire a `TabScaffold`'s bottom tab bar: clicking a tab calls `onSelect` with its
 * id (the app then updates its controlled `active`). Returns a disposer.
 */
export function wireTabScaffold(
  root: Element,
  options: WireTabScaffoldOptions,
): () => void {
  const section = root.matches('[data-component="tab-scaffold"]')
    ? root
    : root.querySelector('[data-component="tab-scaffold"]');
  if (!(section instanceof HTMLElement)) return () => {};
  return delegate(
    section,
    'click',
    '[data-tab-scaffold-tab]',
    (_event, target) => {
      const tabId = target.getAttribute('data-tab-scaffold-tab');
      if (tabId) options.onSelect(tabId);
    },
  );
}
