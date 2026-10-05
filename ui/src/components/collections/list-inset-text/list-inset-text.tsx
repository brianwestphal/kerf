import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import type { Sides } from '../../../shared/layout/sides.js';

const listInsetTextProtectedAttributes = new Set([
  'data-component',
  'data-sides',
]);

type ListInsetTextRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-sides'?: never;
  }
>;

export interface ListInsetTextProps {
  /** Text (or inline content) that carries no margin, border, or padding of its own. */
  children: KerfUiContent | string;
  /** Physical inset sides in canonical top/right/bottom/left order. Defaults to all sides. */
  sides?: Sides;
  className?: string;
  /** Safe `data-*` metadata; component-owned structural attributes stay protected. */
  rootAttributes?: ListInsetTextRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * Gives bare text the content-item geometry — an 8px inline margin, a 1px
 * transparent border, and 8px padding — so a plain string lines up with
 * bordered `.kui-content` items (its text edge lands at the same 17px inset).
 * Use it for text elements that have no margin, border, or padding of their own.
 * Pass `sides="rl"` to keep the horizontal inset but drop the vertical box
 * space for tight text layout.
 */
export function ListInsetText({
  children,
  sides = 'trbl',
  className = '',
  rootAttributes = {},
  slot,
}: ListInsetTextProps) {
  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    listInsetTextProtectedAttributes,
  );
  const cls = `kui-list-inset-text ${className}`.trim();
  return (
    <div
      {...safeRootAttributes}
      class={cls}
      data-component="list-inset-text"
      data-sides={sides}
      slot={slot}
    >
      {children}
    </div>
  );
}

export type { Sides } from '../../../shared/layout/sides.js';
