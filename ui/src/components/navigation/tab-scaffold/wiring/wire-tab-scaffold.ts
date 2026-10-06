import { delegate } from 'kerfjs';

export interface WireTabNavigatorOptions {
  /** Invoked with the selected tab id when a bottom-bar tab is activated. */
  onSelect: (tabId: string) => void;
}

/** @deprecated Use `WireTabNavigatorOptions`. Kept for the 5.x migration window. */
export type WireTabScaffoldOptions = WireTabNavigatorOptions;

/**
 * Wire a `TabNavigator`'s bottom tab bar: clicking a tab calls `onSelect` with its
 * id (the app then updates its controlled `active`). Returns a disposer.
 */
export function wireTabNavigator(
  root: Element,
  options: WireTabNavigatorOptions,
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

/** @deprecated Use `wireTabNavigator`. Kept for the 5.x migration window. */
export const wireTabScaffold: typeof wireTabNavigator = wireTabNavigator;
