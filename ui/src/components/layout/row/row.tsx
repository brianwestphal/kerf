import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import {
  type HorizontalAlignment,
  horizontalAlignment,
  type VerticalAlignment,
  verticalAlignment,
} from '../../../shared/layout/flex-alignment.js';
import { gapLength } from '../../../shared/layout/gap.js';
import type { Sides } from '../../../shared/layout/sides.js';
import {
  type CssFlex,
  type CssFlexKeyword,
  type UiGap,
} from '../../../shared/styles/css-values.js';

const rowProtectedAttributes = new Set([
  'data-component',
  'data-h-align',
  'data-v-align',
  'data-flex',
  'data-fill',
  'data-wrap',
  'data-text-insets',
  'data-control-insets',
]);

type RowRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-h-align'?: never;
    'data-v-align'?: never;
    'data-flex'?: never;
    'data-fill'?: never;
    'data-wrap'?: never;
    'data-text-insets'?: never;
    'data-control-insets'?: never;
  }
>;

export interface RowProps {
  children?: KerfUiContent;
  /** Horizontal distribution. Defaults to left. */
  hAlign?: HorizontalAlignment;
  /** Vertical alignment and wrapped-line distribution. Defaults to full. */
  vAlign?: VerticalAlignment;
  /** One spacing value or separate column and row values. Defaults to xs. */
  gap?: UiGap;
  /** Allow this row to grow/shrink, use a keyword, or supply a typed CSS flex shorthand. */
  flex?: boolean | CssFlexKeyword | CssFlex;
  /**
   * Fill the height of a parent with a definite height, such as an app root or
   * a fixed-height frame, when this row is that parent's layout root. Inside a
   * flex layout use `flex` instead. Defaults to false.
   */
  fill?: boolean;
  /** Allow children to wrap onto additional lines. */
  wrap?: boolean;
  /** Physical sides that receive the standard 17px text inset. */
  textInsets?: Sides;
  /** Physical sides that receive the standard 8px control inset. Text insets win on overlap. */
  controlInsets?: Sides;
  className?: string;
  /** Safe `data-*` metadata; Row-owned structural attributes remain protected. */
  rootAttributes?: RowRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** A horizontal flex row with explicit physical-axis alignment and spacing. */
export function Row({
  children,
  hAlign = 'left',
  vAlign = 'full',
  gap = 'xs',
  flex = false,
  fill = false,
  wrap = false,
  textInsets = '',
  controlInsets = '',
  className = '',
  rootAttributes = {},
  slot,
}: RowProps) {
  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    rowProtectedAttributes,
  );
  const gapStyle =
    typeof gap === 'string'
      ? `--_kui-row-gap:${gapLength(gap)}`
      : `--_kui-row-column-gap:${gapLength(gap.column)};--_kui-row-row-gap:${gapLength(gap.row)}`;
  const flexValue = flex === true ? '1 1 auto' : flex || undefined;
  const style = [gapStyle, flexValue ? `--_kui-row-flex:${flexValue}` : '']
    .filter(Boolean)
    .join(';');

  return (
    <div
      {...safeRootAttributes}
      class={`kui-row ${className}`.trim()}
      data-component="row"
      data-h-align={horizontalAlignment(hAlign)}
      data-v-align={verticalAlignment(vAlign)}
      data-flex={String(Boolean(flex))}
      data-fill={fill ? 'true' : undefined}
      data-wrap={String(wrap)}
      data-text-insets={textInsets || undefined}
      data-control-insets={controlInsets || undefined}
      style={style}
      slot={slot}
    >
      {children}
    </div>
  );
}

export type {
  HorizontalAlignment,
  VerticalAlignment,
} from '../../../shared/layout/flex-alignment.js';
export type { Sides } from '../../../shared/layout/sides.js';
export type {
  CssFlex,
  CssFlexKeyword,
  CssLength,
  UiGap,
  UiGapValue,
  UiSpaceName,
} from '../../../shared/styles/css-values.js';
