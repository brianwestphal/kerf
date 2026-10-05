import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import {
  type HorizontalAlignment,
  horizontalAlignment,
  type ListVerticalAlignment,
  verticalAlignment,
} from '../../../shared/layout/flex-alignment.js';
import type { Sides } from '../../../shared/layout/sides.js';
import {
  type CssFlex,
  type CssFlexKeyword,
  type CssLength,
  space,
  type UiSpaceName,
} from '../../../shared/styles/css-values.js';

const listProtectedAttributes = new Set([
  'data-component',
  'data-gap',
  'data-flex',
  'data-fill',
  'data-h-align',
  'data-v-align',
  'data-scrollable',
  'data-text-insets',
  'data-control-insets',
]);

type ListRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-gap'?: never;
    'data-flex'?: never;
    'data-fill'?: never;
    'data-h-align'?: never;
    'data-v-align'?: never;
    'data-scrollable'?: never;
    'data-text-insets'?: never;
    'data-control-insets'?: never;
  }
>;

const spaceNames: readonly UiSpaceName[] = [
  'none',
  '2xs',
  'xs',
  's',
  'm',
  'l',
  'xl',
];

export interface ListProps {
  children?: KerfUiContent;
  /** Make this list a labeled multi-select grid for `ContentItem selectionMode="multiple"` rows. */
  selectionMode?: 'multiple';
  /** Accessible name for the multi-select grid. */
  ariaLabel?: string;
  /** Use the standard item gap, a named UI spacing token, or a typed CSS length. Defaults to no gap. */
  gap?: boolean | UiSpaceName | CssLength;
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
  /** Own vertical scrolling and overscroll containment. */
  scrollable?: boolean;
  /** Physical divider edges in canonical top/right/bottom/left order. */
  dividerSides?: Sides;
  /** Physical sides that receive the standard 17px text inset. */
  textInsets?: Sides;
  /** Physical sides that receive the standard 8px control inset. Text insets win on overlap. */
  controlInsets?: Sides;
  className?: string;
  /** Safe `data-*` metadata; List-owned structural attributes remain protected. */
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
  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    listProtectedAttributes,
  );
  const gapValue =
    gap === true
      ? 'var(--kui-list-gap)'
      : spaceNames.includes(gap as UiSpaceName)
        ? space(gap as UiSpaceName)
        : gap || undefined;
  const flexValue = flex === true ? '1 1 auto' : flex || undefined;
  const style = [
    gapValue ? `--_kui-list-gap:${gapValue}` : '',
    flexValue ? `--_kui-list-flex:${flexValue}` : '',
  ]
    .filter(Boolean)
    .join(';');

  return (
    <div
      {...safeRootAttributes}
      class={`kui-list ${className}`.trim()}
      data-component="list"
      role={selectionMode === 'multiple' ? 'grid' : undefined}
      aria-label={selectionMode === 'multiple' ? ariaLabel : undefined}
      aria-multiselectable={selectionMode === 'multiple' ? 'true' : undefined}
      data-gap={String(Boolean(gap))}
      data-flex={String(Boolean(flex))}
      data-fill={fill ? 'true' : undefined}
      data-h-align={horizontalAlignment(hAlign)}
      data-v-align={verticalAlignment(vAlign)}
      data-scrollable={String(scrollable)}
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
export type { Sides } from '../../../shared/layout/sides.js';
export type {
  CssFlex,
  CssFlexKeyword,
  CssLength,
  UiSpaceName,
} from '../../../shared/styles/css-values.js';
