import type { KerfUiContent } from './semantic-content.js';

export interface ListInsetControlProps {
  /** Control(s) that own their own border and padding (e.g. an input, a `wa-*`). */
  children: KerfUiContent;
  className?: string;
}

/**
 * Insets a control into a pane/list content region: an 8px inline margin (so its
 * edges line up with `.kui-content` items) and a stretch flex row with an 8px gap.
 * Use it for controls that carry their own border and padding but no outer margin
 * — the wrapper adds only the alignment margin and layout, not a second inset.
 */
export function ListInsetControl({
  children,
  className = '',
}: ListInsetControlProps) {
  return (
    <div
      class={`kui-list-inset-control ${className}`.trim()}
      data-component="list-inset-control"
    >
      {children}
    </div>
  );
}
