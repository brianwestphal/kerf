import {
  type CssFlex,
  type CssFlexKeyword,
  type CssLength,
  space,
  type UiSpaceName,
} from './css-values.js';
import type { DividerSides, Sides } from './divider-sides.js';
import {
  type HorizontalAlignment,
  horizontalAlignment,
  type ListVerticalAlignment,
  verticalAlignment,
} from './flex-alignment.js';
import type { KerfUiContent } from './semantic-content.js';

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
  /** Use the standard item gap, a named UI spacing token, or a typed CSS length. Defaults to no gap. */
  gap?: boolean | UiSpaceName | CssLength;
  /** Allow this list to grow/shrink, use a keyword, or supply a typed CSS flex shorthand. */
  flex?: boolean | CssFlexKeyword | CssFlex;
  /** Horizontal alignment. Defaults to full to preserve stretch-aligned list children. */
  hAlign?: HorizontalAlignment;
  /** Vertical distribution. Defaults to top. */
  vAlign?: ListVerticalAlignment;
  /** Own vertical scrolling and overscroll containment. */
  scrollable?: boolean;
  /** Physical divider edges in canonical top/right/bottom/left order. */
  dividerSides?: DividerSides;
  /** Physical sides that receive the standard 17px text inset. */
  textInsets?: Sides;
  /** Physical sides that receive the standard 8px control inset. Text insets win on overlap. */
  controlInsets?: Sides;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** A stretch-aligned vertical stack with optional gap, flex, scroll, and dividers. */
export function List({
  children,
  gap = false,
  flex = false,
  hAlign = 'full',
  vAlign = 'top',
  scrollable = false,
  dividerSides = '',
  textInsets = '',
  controlInsets = '',
  className = '',
  slot,
}: ListProps) {
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
      class={`kui-list ${className}`.trim()}
      data-component="list"
      data-gap={String(Boolean(gap))}
      data-flex={String(Boolean(flex))}
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
  CssFlex,
  CssFlexKeyword,
  CssLength,
  UiSpaceName,
} from './css-values.js';
export type { DividerSides, Sides } from './divider-sides.js';
export type {
  HorizontalAlignment,
  ListVerticalAlignment,
  VerticalAlignment,
} from './flex-alignment.js';
