import type { Sides } from './divider-sides.js';
import type { KerfUiContent } from './semantic-content.js';

export interface ListInsetTextProps {
  /** Text (or inline content) that carries no margin, border, or padding of its own. */
  children: KerfUiContent | string;
  /** Physical inset sides in canonical top/right/bottom/left order. Defaults to all sides. */
  sides?: Sides;
  /**
   * @deprecated Pass `sides="rl"` instead. Keep only the horizontal geometry (inline margin, left/right border, and
   * left/right padding) and drop the vertical margin, border, and padding. Use it
   * when the text edge must still align with bordered items but the line should not
   * add its own vertical box space — tight text layout inside a content region.
   */
  horizontalOnly?: boolean;
  className?: string;
}

/**
 * Gives bare text the content-item geometry — an 8px inline margin, a 1px
 * transparent border, and 8px padding — so a plain string lines up with
 * bordered `.kui-content` items (its text edge lands at the same 17px inset).
 * Use it for text elements that have no margin, border, or padding of their own.
 * Pass `horizontalOnly` to keep the horizontal inset but drop the vertical box
 * space for tight text layout.
 */
export function ListInsetText({
  children,
  sides,
  horizontalOnly = false,
  className = '',
}: ListInsetTextProps) {
  const resolvedSides = sides ?? (horizontalOnly ? 'rl' : 'trbl');
  const cls =
    `kui-list-inset-text${horizontalOnly ? ' kui-list-inset-text--horizontal' : ''} ${className}`.trim();
  return (
    <div
      class={cls}
      data-component="list-inset-text"
      data-sides={resolvedSides}
    >
      {children}
    </div>
  );
}

export type { Sides } from './divider-sides.js';
