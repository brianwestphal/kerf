// KF-Z6T0RS: the "restore owned inline styles after a morph" observer that
// DialogSurface's controller and wirePinnablePopover both need.
import { realmOf } from './realm.js';

/** Re-apply every owned inline style property `element` no longer carries. */
export function restoreOwnedStyles(
  element: HTMLElement,
  owned: ReadonlyMap<string, string>,
): void {
  for (const [property, value] of owned)
    if (element.style.getPropertyValue(property) !== value)
      element.style.setProperty(property, value);
}

export interface OwnedStylesOptions {
  /** Further attributes whose change should also run `onChange`. */
  readonly attributes?: readonly string[];
  /** Also watch child replacement (`subtree` adds descendants). */
  readonly childList?: boolean;
  readonly subtree?: boolean;
  /** Runs before the owned styles are restored (e.g. to adopt a resize). */
  readonly beforeRestore?: () => void;
  /** Runs after the owned styles are restored (e.g. to follow new chrome). */
  readonly afterRestore?: () => void;
}

/**
 * Keep the inline style properties a controller owns on `element` across an
 * application re-render: when a morph rewrites `style` (or the other watched
 * attributes or children), restore every entry of `owned`. `owned` is read
 * live, so the caller keeps adding and removing entries. Returns the
 * observer; disconnect it on teardown. The observer comes from `element`'s
 * own realm, per the package's realm convention.
 */
export function watchOwnedStyles(
  element: HTMLElement,
  owned: ReadonlyMap<string, string>,
  options: OwnedStylesOptions = {},
): MutationObserver {
  const observer = new (realmOf(element).MutationObserver)(() => {
    options.beforeRestore?.();
    restoreOwnedStyles(element, owned);
    options.afterRestore?.();
  });
  observer.observe(element, {
    attributes: true,
    attributeFilter: ['style', ...(options.attributes ?? [])],
    childList: options.childList ?? false,
    subtree: options.subtree ?? false,
  });
  return observer;
}
