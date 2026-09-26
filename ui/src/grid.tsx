import {
  type CssFlex,
  type CssFlexKeyword,
  type CssLength,
  space,
  type UiSpaceName,
} from './css-values.js';
import { filterDataAttributes } from './extension-attributes.js';
import type { KerfUiContent } from './semantic-content.js';

const gridProtectedAttributes = new Set([
  'data-component',
  'data-columns',
  'data-flex',
  'data-fill',
]);

type GridRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-columns'?: never;
    'data-flex'?: never;
    'data-fill'?: never;
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

export interface GridProps {
  children?: KerfUiContent;
  /** Number of equal-width columns. Must be a positive safe integer. */
  columns: number;
  /** A named UI spacing token or typed CSS length. Defaults to xs. */
  gap?: UiSpaceName | CssLength;
  /** Allow this grid to grow/shrink, use a keyword, or supply a typed CSS flex shorthand. */
  flex?: boolean | CssFlexKeyword | CssFlex;
  /**
   * Fill the height of a parent with a definite height, such as an app root or
   * a fixed-height frame, when this grid is that parent's layout root. Inside a
   * flex layout use `flex` instead. Defaults to false.
   */
  fill?: boolean;
  className?: string;
  /** Safe `data-*` metadata; Grid-owned structural attributes remain protected. */
  rootAttributes?: GridRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** A fixed-count grid whose columns share the available width equally. */
export function Grid({
  children,
  columns,
  gap = 'xs',
  flex = false,
  fill = false,
  className = '',
  rootAttributes = {},
  slot,
}: GridProps) {
  if (!Number.isSafeInteger(columns) || columns < 1) {
    throw new RangeError('Grid columns must be a positive safe integer');
  }

  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    gridProtectedAttributes,
  );
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
      {...safeRootAttributes}
      class={`kui-grid ${className}`.trim()}
      data-component="grid"
      data-columns={String(columns)}
      data-flex={String(Boolean(flex))}
      data-fill={fill ? 'true' : undefined}
      style={style}
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
