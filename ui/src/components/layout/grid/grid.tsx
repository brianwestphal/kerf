import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import type { Sides } from '../../../shared/layout/sides.js';
import {
  type CssFlex,
  type CssFlexKeyword,
  type CssLength,
  space,
  type UiSpaceName,
} from '../../../shared/styles/css-values.js';

const gridProtectedAttributes = new Set([
  'data-component',
  'data-columns',
  'data-min-column-width',
  'data-auto-fill',
  'data-flex',
  'data-fill',
  'data-text-insets',
  'data-control-insets',
]);

type GridRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-columns'?: never;
    'data-min-column-width'?: never;
    'data-auto-fill'?: never;
    'data-flex'?: never;
    'data-fill'?: never;
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

interface GridCommonProps {
  children?: KerfUiContent;
  /** Make this a labeled multi-select grid for `ContentItem selectionMode="multiple"` tiles. */
  selectionMode?: 'multiple';
  /** Accessible name for the multi-select grid. */
  ariaLabel?: string;
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
  /** Physical sides that receive the standard 17px text inset. */
  textInsets?: Sides;
  /** Physical sides that receive the standard 8px control inset. Text insets win on overlap. */
  controlInsets?: Sides;
  className?: string;
  /** Safe `data-*` metadata; Grid-owned structural attributes remain protected. */
  rootAttributes?: GridRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export type GridProps = GridCommonProps &
  (
    | {
        /** Number of equal-width columns. Must be a positive safe integer. */
        columns: number;
        minColumnWidth?: never;
        autoFill?: never;
      }
    | {
        columns?: never;
        /** Fit equal columns of at least this width; collapse as the container narrows. */
        minColumnWidth: CssLength;
        /** Keep empty tracks instead of stretching a sparse row. Defaults to false. */
        autoFill?: boolean;
      }
  );

/** Render equal tracks with a fixed count or a responsive minimum width. */
export function Grid({
  children,
  selectionMode,
  ariaLabel,
  columns,
  minColumnWidth,
  autoFill = false,
  gap = 'xs',
  flex = false,
  fill = false,
  textInsets = '',
  controlInsets = '',
  className = '',
  rootAttributes = {},
  slot,
}: GridProps) {
  if (selectionMode === 'multiple' && !ariaLabel) {
    throw new Error('Multi-select Grid requires an ariaLabel');
  }
  if (minColumnWidth !== undefined && columns !== undefined) {
    throw new RangeError(
      'Grid columns and minColumnWidth are mutually exclusive',
    );
  }
  if (autoFill && minColumnWidth === undefined) {
    throw new RangeError('Grid autoFill requires minColumnWidth');
  }
  if (
    minColumnWidth === undefined &&
    (columns === undefined || !Number.isSafeInteger(columns) || columns < 1)
  ) {
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
    columns === undefined ? '' : `--_kui-grid-columns:${columns}`,
    minColumnWidth === undefined
      ? ''
      : `--_kui-grid-min-column-width:${minColumnWidth}`,
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
      role={selectionMode === 'multiple' ? 'grid' : undefined}
      aria-label={selectionMode === 'multiple' ? ariaLabel : undefined}
      aria-multiselectable={selectionMode === 'multiple' ? 'true' : undefined}
      data-columns={columns === undefined ? undefined : String(columns)}
      data-min-column-width={minColumnWidth === undefined ? undefined : 'true'}
      data-auto-fill={autoFill ? 'true' : undefined}
      data-flex={String(Boolean(flex))}
      data-fill={fill ? 'true' : undefined}
      data-text-insets={textInsets || undefined}
      data-control-insets={controlInsets || undefined}
      style={style}
      slot={slot}
    >
      {children}
    </div>
  );
}

export type { Sides } from '../../../shared/layout/sides.js';
export type {
  CssFlex,
  CssFlexKeyword,
  CssLength,
  UiSpaceName,
} from '../../../shared/styles/css-values.js';
