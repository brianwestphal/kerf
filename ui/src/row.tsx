import { type CssLength, space, type UiSpaceName } from './css-values.js';
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
  /** Allow children to wrap onto additional lines. */
  wrap?: boolean;
  className?: string;
}

/** A horizontal flex row with explicit physical-axis alignment and spacing. */
export function Row({
  children,
  hAlign = 'left',
  vAlign = 'full',
  gap = 'xs',
  wrap = false,
  className = '',
}: RowProps) {
  const gapValue = spaceNames.includes(gap as UiSpaceName)
    ? space(gap as UiSpaceName)
    : gap;

  return (
    <div
      class={`kui-row ${className}`.trim()}
      data-component="row"
      data-h-align={horizontalAlignment(hAlign)}
      data-v-align={verticalAlignment(vAlign)}
      data-wrap={String(wrap)}
      style={`--_kui-row-gap:${gapValue}`}
    >
      {children}
    </div>
  );
}

export type { CssLength, UiSpaceName } from './css-values.js';
export type {
  HorizontalAlignment,
  VerticalAlignment,
} from './flex-alignment.js';
