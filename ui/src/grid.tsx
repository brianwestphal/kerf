import {
  type CssFlex,
  type CssFlexKeyword,
  type CssLength,
  space,
  type UiSpaceName,
} from './css-values.js';
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

export interface GridProps {
  children?: KerfUiContent;
  /** Number of equal-width columns. Must be a positive safe integer. */
  columns: number;
  /** A named UI spacing token or typed CSS length. Defaults to xs. */
  gap?: UiSpaceName | CssLength;
  /** Allow this grid to grow/shrink, use a keyword, or supply a typed CSS flex shorthand. */
  flex?: boolean | CssFlexKeyword | CssFlex;
  className?: string;
}

/** A fixed-count grid whose columns share the available width equally. */
export function Grid({
  children,
  columns,
  gap = 'xs',
  flex = false,
  className = '',
}: GridProps) {
  if (!Number.isSafeInteger(columns) || columns < 1) {
    throw new RangeError('Grid columns must be a positive safe integer');
  }

  const gapValue = spaceNames.includes(gap as UiSpaceName)
    ? space(gap as UiSpaceName)
    : gap;
  const flexValue = flex === true ? '1 1 auto' : flex || undefined;
  const style = [
    `--_kui-grid-columns:${columns}`,
    `--_kui-grid-gap:${gapValue}`,
    flexValue ? `--_kui-grid-flex:${flexValue}` : '',
  ]
    .filter(Boolean)
    .join(';');

  return (
    <div
      class={`kui-grid ${className}`.trim()}
      data-component="grid"
      data-columns={String(columns)}
      data-flex={String(Boolean(flex))}
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
