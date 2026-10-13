import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterRootAttributes,
  type StructuralRootAttributes,
} from '../../../shared/dom/extension-attributes.js';
import {
  type HorizontalAlignment,
  horizontalAlignment,
  type ListVerticalAlignment,
  verticalAlignment,
} from '../../../shared/layout/flex-alignment.js';
import { gapLength } from '../../../shared/layout/gap.js';
import type { ScrollClearance } from '../../../shared/layout/scroll-clearance.js';
import type { Sides } from '../../../shared/layout/sides.js';
import {
  type CssFlex,
  type CssFlexKeyword,
  type UiGap,
} from '../../../shared/styles/css-values.js';

/** Attributes a multi-select List owns as an ARIA grid. */
const listGridAttributes = ['role', 'aria-label', 'aria-multiselectable'];

const listProtectedAttributes = new Set([
  'data-component',
  'data-gap',
  'data-flex',
  'data-fill',
  'data-h-align',
  'data-v-align',
  'data-scrollable',
  'data-scroll-clearance',
  'data-surface',
  'data-inset',
  'data-text-insets',
  'data-control-insets',
]);

type ListRootAttributes = StructuralRootAttributes &
  Readonly<{
    'data-component'?: never;
    'data-gap'?: never;
    'data-flex'?: never;
    'data-fill'?: never;
    'data-h-align'?: never;
    'data-v-align'?: never;
    'data-scrollable'?: never;
    'data-scroll-clearance'?: never;
    'data-surface'?: never;
    'data-inset'?: never;
    'data-text-insets'?: never;
    'data-control-insets'?: never;
  }>;

/**
 * A solid surface painted behind a List: `base` is the page surface
 * (`--kui-color-surface`), `raised` the raised surface
 * (`--kui-color-surface-raised`). A lowered region is a `SunkenPanel`.
 */
export type ListSurface = 'base' | 'raised';

/**
 * A preset inset on all four sides. `document` is the reading inset for long
 * content such as a reader view: 24px block and 32px inline, narrowing to
 * 16px inline below 576px. It replaces any `textInsets`/`controlInsets`.
 */
export type ListInset = 'document';

export interface ListProps {
  children?: KerfUiContent;
  /** Make this list a labeled multi-select grid for `ContentItem selectionMode="multiple"` rows. */
  selectionMode?: 'multiple';
  /** Accessible name for the multi-select grid. */
  ariaLabel?: string;
  /** Standard gap (`true`), one spacing value, or separate column and row values. Defaults to no gap. */
  gap?: boolean | UiGap;
  /** Allow this list to grow/shrink, use a keyword, or supply a typed CSS flex shorthand. */
  flex?: boolean | CssFlexKeyword | CssFlex;
  /**
   * Fill the height of a parent with a definite height, such as an app root or
   * a fixed-height frame, when this list is that parent's layout root. Inside a
   * flex layout use `flex` instead. Defaults to false.
   */
  fill?: boolean;
  /** Horizontal alignment. Defaults to full to preserve stretch-aligned list children. */
  hAlign?: HorizontalAlignment;
  /** Vertical distribution. Defaults to top. */
  vAlign?: ListVerticalAlignment;
  /**
   * Own vertical scrolling and overscroll containment. Children keep their
   * natural height and scroll instead of shrinking. To bound the list by a
   * `max-height` ancestor (no definite height), give that ancestor a flex
   * column and use `flex`; `fill` needs a definite-height parent.
   */
  scrollable?: boolean;
  /**
   * Clear chrome that lies over this scrollable List's block-start and/or
   * block-end edge, such as a `DialogSurface` floating footer. The List adds
   * the inherited `--kui-scroll-clearance-block-*` context that chrome
   * publishes to its own block padding and `scroll-padding`, so its rows
   * scroll visibly beneath the chrome while the first and last rows (and any
   * row focused or scrolled into view) can still rest clear of it. Opt in only
   * the one scroller that reaches the covered edge. Defaults to none.
   */
  scrollClearance?: ScrollClearance;
  /**
   * Paint a solid surface behind the stack, including its insets: for a strip
   * of chrome (a banner above a sunken work area) that must not show the
   * lowered tint around its content. Omitted, the List is transparent.
   */
  surface?: ListSurface;
  /** Physical divider edges in canonical top/right/bottom/left order. */
  dividerSides?: Sides;
  /** A preset four-sided inset; see `ListInset`. */
  inset?: ListInset;
  /** Physical sides that receive the standard 17px text inset. */
  textInsets?: Sides;
  /** Physical sides that receive the standard 8px control inset. Text insets win on overlap. */
  controlInsets?: Sides;
  className?: string;
  /**
   * Safe `data-*`, `aria-*`, and structural `role` metadata (a named drop
   * `region`, `aria-busy`); List-owned structural attributes remain
   * protected, and a multi-select List owns its grid role and name.
   */
  rootAttributes?: ListRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A list's configuration, apart from its content and styling hooks: the props a
 * composite that renders a `List` for the app (the Workbench's `mainHeader` /
 * `mainFooter` chrome) forwards, so the app configures that list instead of
 * styling it. An omitted or `undefined` field keeps the composite's default.
 */
export type ListConfig = Pick<
  ListProps,
  'gap' | 'hAlign' | 'vAlign' | 'dividerSides' | 'textInsets' | 'controlInsets'
>;

/** A stretch-aligned vertical stack with optional gap, flex, fill, scroll, and dividers. */
export function List({
  children,
  selectionMode,
  ariaLabel,
  gap = false,
  flex = false,
  fill = false,
  hAlign = 'full',
  vAlign = 'top',
  scrollable = false,
  scrollClearance,
  surface,
  inset,
  dividerSides = '',
  textInsets = '',
  controlInsets = '',
  className = '',
  rootAttributes = {},
  slot,
}: ListProps) {
  if (selectionMode === 'multiple' && !ariaLabel) {
    throw new Error('Multi-select List requires an ariaLabel');
  }
  const multiple = selectionMode === 'multiple';
  const safeRootAttributes = filterRootAttributes(
    rootAttributes,
    multiple
      ? new Set([...listProtectedAttributes, ...listGridAttributes])
      : listProtectedAttributes,
  );
  const gridAttributes = multiple
    ? {
        role: 'grid',
        'aria-label': ariaLabel,
        'aria-multiselectable': 'true',
      }
    : {};
  const gapStyle =
    gap === true
      ? '--_kui-list-gap:var(--kui-list-gap)'
      : gap === false
        ? ''
        : typeof gap === 'string'
          ? `--_kui-list-gap:${gapLength(gap)}`
          : `--_kui-list-column-gap:${gapLength(gap.column)};--_kui-list-row-gap:${gapLength(gap.row)}`;
  const flexValue = flex === true ? '1 1 auto' : flex || undefined;
  const style = [gapStyle, flexValue ? `--_kui-list-flex:${flexValue}` : '']
    .filter(Boolean)
    .join(';');

  return (
    <div
      {...safeRootAttributes}
      {...gridAttributes}
      class={`kui-list ${className}`.trim()}
      data-component="list"
      data-gap={String(Boolean(gap))}
      data-flex={String(Boolean(flex))}
      data-fill={fill ? 'true' : undefined}
      data-h-align={horizontalAlignment(hAlign)}
      data-v-align={verticalAlignment(vAlign)}
      data-scrollable={String(scrollable)}
      data-scroll-clearance={scrollClearance}
      data-surface={surface}
      data-inset={inset}
      divider-sides={dividerSides || undefined}
      data-text-insets={textInsets || undefined}
      data-control-insets={controlInsets || undefined}
      style={style || undefined}
      slot={slot}
    >
      {children}
    </div>
  );
}

export type {
  HorizontalAlignment,
  ListVerticalAlignment,
  VerticalAlignment,
} from '../../../shared/layout/flex-alignment.js';
export type { ScrollClearance } from '../../../shared/layout/scroll-clearance.js';
export type { Sides } from '../../../shared/layout/sides.js';
export type {
  CssFlex,
  CssFlexKeyword,
  CssLength,
  UiGap,
  UiGapValue,
  UiSpaceName,
} from '../../../shared/styles/css-values.js';
