import {
  type CssFlex,
  type CssFlexKeyword,
  type CssLength,
  space,
  type UiSpaceName,
} from './css-values.js';
import type { Sides } from './divider-sides.js';
import {
  type HorizontalAlignment,
  horizontalAlignment,
  type VerticalAlignment,
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

export interface RowProps {
  children?: KerfUiContent;
  /** Horizontal distribution. Defaults to left. */
  hAlign?: HorizontalAlignment;
  /** Vertical alignment and wrapped-line distribution. Defaults to full. */
  vAlign?: VerticalAlignment;
  /** A named UI spacing token or typed CSS length. Defaults to xs. */
  gap?: UiSpaceName | CssLength;
  /** Allow this row to grow/shrink, use a keyword, or supply a typed CSS flex shorthand. */
  flex?: boolean | CssFlexKeyword | CssFlex;
  /** Allow children to wrap onto additional lines. */
  wrap?: boolean;
  /** Physical sides that receive the standard 17px text inset. */
  textInsets?: Sides;
  /** Physical sides that receive the standard 8px control inset. Text insets win on overlap. */
  controlInsets?: Sides;
  className?: string;
}

/** A horizontal flex row with explicit physical-axis alignment and spacing. */
export function Row({
  children,
  hAlign = 'left',
  vAlign = 'full',
  gap = 'xs',
  flex = false,
  wrap = false,
  textInsets = '',
  controlInsets = '',
  className = '',
}: RowProps) {
  const gapValue = spaceNames.includes(gap as UiSpaceName)
    ? space(gap as UiSpaceName)
    : gap;
  const flexValue = flex === true ? '1 1 auto' : flex || undefined;
  const style = [
    `--_kui-row-gap:${gapValue}`,
    flexValue ? `--_kui-row-flex:${flexValue}` : '',
  ]
    .filter(Boolean)
    .join(';');

  return (
    <div
      class={`kui-row ${className}`.trim()}
      data-component="row"
      data-h-align={horizontalAlignment(hAlign)}
      data-v-align={verticalAlignment(vAlign)}
      data-flex={String(Boolean(flex))}
      data-wrap={String(wrap)}
      text-insets={textInsets || undefined}
      control-insets={controlInsets || undefined}
      style={style}
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
export type { Sides } from './divider-sides.js';
export type {
  HorizontalAlignment,
  VerticalAlignment,
} from './flex-alignment.js';
