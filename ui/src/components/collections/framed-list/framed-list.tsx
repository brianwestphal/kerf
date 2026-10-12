import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';

/** The frame's fill: the lowered surface (as `ValueTable`), or the page surface. */
export type FramedListSurface = 'lowered' | 'base';

const framedListProtected = new Set(['data-component', 'data-surface']);
const framedListRowProtected = new Set(['data-component', 'data-highlighted']);

type FramedListRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-surface'?: never;
  }
>;

type FramedListRowRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-highlighted'?: never;
  }
>;

export interface FramedListProps {
  /** `FramedListRow` children. */
  children: KerfUiContent;
  /** Accessible name for the list, when no heading names it. */
  label?: string;
  /** Frame fill; defaults to `lowered`, matching `ValueTable`. */
  surface?: FramedListSurface;
  id?: string;
  className?: string;
  /** Safe `data-*` metadata; FramedList-owned markers stay protected. */
  rootAttributes?: FramedListRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export interface FramedListRowProps {
  /** Arbitrary row content: a `Row` of copy and controls, a keycap, … */
  children: KerfUiContent;
  /** Tint the row (the row being edited or the current item). */
  highlighted?: boolean;
  id?: string;
  className?: string;
  /** Safe `data-*` metadata; FramedListRow-owned markers stay protected. */
  rootAttributes?: FramedListRowRootAttributes;
}

/**
 * An inset-grouped list (the settings-list pattern): one rounded, bordered
 * frame with 1px dividers between rows of arbitrary content. `ValueTable` is
 * the same frame for label/value facts; this one takes any row content.
 */
export function FramedList({
  children,
  label,
  surface = 'lowered',
  id,
  className = '',
  rootAttributes = {},
  slot,
}: FramedListProps) {
  return (
    <ul
      {...filterDataAttributes(rootAttributes, framedListProtected)}
      id={id}
      class={`kui-framed-list ${className}`.trim()}
      data-component="framed-list"
      data-surface={surface}
      role="list"
      aria-label={label}
      slot={slot}
    >
      {children}
    </ul>
  );
}

/** One row of a `FramedList`; it owns the row inset and the divider above it. */
export function FramedListRow({
  children,
  highlighted = false,
  id,
  className = '',
  rootAttributes = {},
}: FramedListRowProps) {
  return (
    <li
      {...filterDataAttributes(rootAttributes, framedListRowProtected)}
      id={id}
      class={`kui-framed-list__row ${className}`.trim()}
      data-component="framed-list-row"
      data-highlighted={highlighted ? 'true' : undefined}
    >
      {children}
    </li>
  );
}
