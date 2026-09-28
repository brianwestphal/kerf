import { filterDataAttributes } from './extension-attributes.js';
import type { KerfUiContent } from './semantic-content.js';

/** Whether the item's always-reserved 1px border is transparent or visible. */
export type ContentItemFrame = 'none' | 'framed';

/** Corner shape: the 12px rounded rectangle or the 22px pill. */
export type ContentItemShape = 'rounded' | 'pill';

const contentItemProtectedAttributes = new Set(['data-component']);

type ContentItemRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
  }
>;

export interface ContentItemProps {
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
  /** Safe `data-*` metadata; component-owned structural attributes stay protected. */
  rootAttributes?: ContentItemRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

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
  className = '',
  rootAttributes = {},
  slot,
}: ContentItemProps) {
  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    contentItemProtectedAttributes,
  );
  const cls = [
    'kui-content-item',
    shape === 'pill' ? 'kui-content-item--pill' : '',
    frame === 'framed' ? 'kui-content-item--framed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      {...safeRootAttributes}
      class={cls}
      data-component="content-item"
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
      tabindex={focusTarget ? '-1' : undefined}
      slot={slot}
    >
      {children}
    </div>
  );
}
