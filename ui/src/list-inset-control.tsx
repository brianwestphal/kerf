import type { Sides } from './divider-sides.js';
import type { KerfUiContent } from './semantic-content.js';

export interface ListInsetControlProps {
  /** Control(s) that own their own border and padding (e.g. an input, a `wa-*`). */
  children: KerfUiContent;
  /** Physical inset sides in canonical top/right/bottom/left order. Defaults to all sides. */
  sides?: Sides;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * Insets a control into a pane/list content region: an 8px inline margin (so its
 * edges line up with `.kui-content` items) and a stretch flex row with an 8px gap.
 * Use it for controls that carry their own border and padding but no outer margin
 * — the wrapper adds only the alignment margin and layout, not a second inset.
 */
export function ListInsetControl({
  children,
  sides = 'trbl',
  className = '',
  slot,
}: ListInsetControlProps) {
  return (
    <div
      class={`kui-list-inset-control ${className}`.trim()}
      data-component="list-inset-control"
      data-sides={sides}
      slot={slot}
    >
      {children}
    </div>
  );
}

export type { Sides } from './divider-sides.js';
