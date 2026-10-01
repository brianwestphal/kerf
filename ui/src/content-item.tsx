import { filterDataAttributes } from './extension-attributes.js';
import type { KerfUiContent } from './semantic-content.js';

/** Whether the item's always-reserved 1px border is transparent or visible. */
export type ContentItemFrame = 'none' | 'framed';

/** Corner shape: the 12px rounded rectangle or the 22px pill. */
export type ContentItemShape = 'rounded' | 'pill';
/** `single` uses option selection; `toggle` uses a pressed button. */
export type ContentItemSelectionMode = 'none' | 'single' | 'toggle';

const contentItemProtectedAttributes = new Set(['data-component']);
const interactiveProtectedAttributes = new Set([
  'data-component',
  'data-action',
  'data-item-id',
  'data-interactive',
  'data-selected',
  'data-disabled',
  'data-selection-mode',
  'data-kui-pressed',
]);

type ContentItemRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
  }
>;

type ContentItemInteractiveRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-interactive'?: never;
    'data-selected'?: never;
    'data-disabled'?: never;
    'data-selection-mode'?: never;
    'data-kui-pressed'?: never;
  }
>;

interface ContentItemBaseProps {
  /** Item content; a plain string is allowed for bare copy. */
  children?: KerfUiContent | string;
  /**
   * `framed` paints the standard neutral border in the 1px the item always
   * reserves, so framing never changes geometry. Frame only an item that
   * marks a real distinction. Defaults to `none` (transparent border).
   */
  frame?: ContentItemFrame;
  /** Corner shape. Defaults to `rounded`. */
  shape?: ContentItemShape;
  /**
   * Names the item as a distinct region (`role="region"`). Omit it for an
   * ordinary item, which stays a non-landmark grouping.
   */
  ariaLabel?: string;
  /**
   * Makes the item a programmatic focus target (`tabindex="-1"`, never a tab
   * stop), for example the preferred initial focus of a NavStack view when
   * combined with `data-nav-focus` in `rootAttributes`.
   */
  focusTarget?: boolean;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export type ContentItemProps = ContentItemBaseProps &
  (
    | {
        interactive?: false;
        action?: never;
        itemId?: never;
        selectionMode?: never;
        selected?: never;
        disabled?: never;
        /** Existing static `data-*` metadata remains available. */
        rootAttributes?: ContentItemRootAttributes;
      }
    | {
        /** Enable a keyboard reachable card; wire `wireContentItems` once on its containing root. */
        interactive: true;
        /** Delegated action dispatched by pointer, Enter, or Space. */
        action: string;
        itemId?: string;
        selectionMode?: ContentItemSelectionMode;
        selected?: boolean;
        disabled?: boolean;
        /** Safe app metadata; interaction attributes are component-owned. */
        rootAttributes?: ContentItemInteractiveRootAttributes;
      }
  );

/**
 * One self-contained `.kui-content` child: an 8px inline margin, a real 1px
 * border (transparent unless `framed`), 8px padding, and a rounded or pill
 * radius. It owns that whole geometry, so wrappers must not add more.
 */
export function ContentItem({
  children,
  frame = 'none',
  shape = 'rounded',
  ariaLabel,
  focusTarget = false,
  interactive = false,
  action,
  itemId,
  selectionMode = 'none',
  selected = false,
  disabled = false,
  className = '',
  rootAttributes = {},
  slot,
}: ContentItemProps) {
  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    interactive
      ? interactiveProtectedAttributes
      : contentItemProtectedAttributes,
  );
  if (interactive && !action) {
    throw new Error('Interactive ContentItem requires an action');
  }
  if (interactive && selected && selectionMode === 'none') {
    throw new Error('Selected ContentItem requires a selectionMode');
  }
  const cls = [
    'kui-content-item',
    shape === 'pill' ? 'kui-content-item--pill' : '',
    frame === 'framed' ? 'kui-content-item--framed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const interactiveAttributes = interactive
    ? {
        'data-interactive': 'true',
        'data-action': disabled ? undefined : action,
        'data-item-id': itemId,
        'data-selection-mode': selectionMode,
        'data-selected':
          selectionMode === 'none' ? undefined : String(selected),
        'data-disabled': disabled ? 'true' : undefined,
      }
    : {};
  return (
    <div
      {...safeRootAttributes}
      {...interactiveAttributes}
      class={cls}
      data-component="content-item"
      role={
        interactive
          ? selectionMode === 'single'
            ? 'option'
            : 'button'
          : ariaLabel
            ? 'region'
            : undefined
      }
      aria-label={ariaLabel}
      aria-selected={
        interactive && selectionMode === 'single' ? String(selected) : undefined
      }
      aria-pressed={
        interactive && selectionMode === 'toggle' ? String(selected) : undefined
      }
      aria-disabled={interactive && disabled ? 'true' : undefined}
      tabindex={
        interactive ? (disabled ? '-1' : '0') : focusTarget ? '-1' : undefined
      }
      slot={slot}
    >
      {children}
    </div>
  );
}
