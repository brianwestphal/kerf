import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import type { Sides } from '../../../shared/layout/sides.js';

export interface ListInsetControlProps {
  /** Control(s) that own their own border and padding (e.g. an input, a `wa-*`). */
  children: KerfUiContent;
  /** Physical inset sides in canonical top/right/bottom/left order. Defaults to all sides. */
  sides?: Sides;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const LIST_INSET_CONTROL_PROTECTED = new Set(['data-component', 'data-sides']);

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
  rootAttributes = {},
}: ListInsetControlProps) {
  return (
    <div
      {...filterDataAttributes(rootAttributes, LIST_INSET_CONTROL_PROTECTED)}
      class={`kui-list-inset-control ${className}`.trim()}
      data-component="list-inset-control"
      data-sides={sides}
      slot={slot}
    >
      {children}
    </div>
  );
}

export type { Sides } from '../../../shared/layout/sides.js';
