/**
 * What a pointer or key activation does to a multi-selection:
 * - `replace`: select only the target (a plain click or Enter);
 * - `toggle`: add or remove the target, keeping the rest (Cmd on Apple
 *   platforms, Ctrl elsewhere);
 * - `extend`: select the range from the anchor to the target (Shift).
 */
export type SelectionGesture = 'replace' | 'toggle' | 'extend';

/** The modifier state of a `MouseEvent` or `KeyboardEvent`. */
export interface SelectionModifiers {
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
}

/** True on macOS, iOS, and iPadOS, where Cmd (not Ctrl) toggles one item. */
export function isApplePlatform(
  navigatorLike:
    | Pick<Navigator, 'platform' | 'userAgent'>
    | undefined = globalThis.navigator,
): boolean {
  if (!navigatorLike) return false;
  const platform =
    (navigatorLike as { userAgentData?: { platform?: string } }).userAgentData
      ?.platform ||
    navigatorLike.platform ||
    navigatorLike.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * Map an activation's modifiers to a {@link SelectionGesture}, normalized for
 * the host platform: Shift extends; Cmd on Apple platforms, Ctrl elsewhere,
 * toggles; anything else replaces.
 */
export function selectionGesture(
  modifiers: SelectionModifiers,
  apple: boolean = isApplePlatform(),
): SelectionGesture {
  if (modifiers.shiftKey) return 'extend';
  if (apple ? modifiers.metaKey : modifiers.ctrlKey) return 'toggle';
  return 'replace';
}

export interface ApplySelectionOptions<Id> {
  /** Every selectable id, in display order (leave out disabled items). */
  readonly items: readonly Id[];
  /** The current selection. */
  readonly selected: readonly Id[];
  /**
   * The last replaced or toggled item; a Shift range starts here. Without
   * one, the range starts at the first selected item, then at the target.
   */
  readonly anchor?: Id;
  /** The activated item. */
  readonly target: Id;
  readonly gesture: SelectionGesture;
}

export interface SelectionResult<Id> {
  /** The new selection, in display order. */
  readonly selected: Id[];
  /** The anchor for the next Shift range. */
  readonly anchor: Id;
}

/**
 * Apply one selection gesture to a multi-selection, the conventional desktop
 * list model: `replace` selects only the target, `toggle` flips it and keeps
 * the rest, and `extend` selects the range from the anchor (the first
 * selected item when there is none, else the target) to the target. The anchor moves to the target on
 * `replace` and `toggle` and stays put on `extend`, so successive Shift
 * activations pivot around one item. A target missing from `items` (such as a
 * disabled item) leaves the selection unchanged.
 */
export function applySelection<Id>({
  items,
  selected,
  anchor,
  target,
  gesture,
}: ApplySelectionOptions<Id>): SelectionResult<Id> {
  const inOrder = (ids: ReadonlySet<Id>) => items.filter((id) => ids.has(id));
  const current = new Set(selected);
  if (!items.includes(target))
    return { selected: inOrder(current), anchor: anchor ?? target };
  switch (gesture) {
    case 'replace':
      return { selected: [target], anchor: target };
    case 'toggle':
      if (current.has(target)) current.delete(target);
      else current.add(target);
      return { selected: inOrder(current), anchor: target };
    case 'extend': {
      const pivot =
        anchor !== undefined && items.includes(anchor)
          ? anchor
          : (items.find((id) => current.has(id)) ?? target);
      const from = items.indexOf(pivot);
      const to = items.indexOf(target);
      const range = items.slice(Math.min(from, to), Math.max(from, to) + 1);
      return { selected: range, anchor: pivot };
    }
  }
}
