import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import type { CssLength } from '../../../shared/styles/css-values.js';

export {
  ValueTableRow,
  type ValueTableRowProps,
} from './internal/value-table-row.js';

/** `columns` keeps label and value side by side; `stacked` puts each value under its label. */
export type ValueTablePresentation = 'columns' | 'stacked';
/** Table width below which columns stack: `compact` is 512px, `narrow` 576px. */
export type ValueTableStackBelow = 'compact' | 'narrow';

export interface ValueTableProps {
  label: string;
  /** Compact row spacing for metadata-dense surfaces. */
  density?: 'default' | 'compact';
  /**
   * Minimum width of the label column (for example `px(160)`); the value then
   * takes the rest of the row. Omitted, label and value share the row by
   * content.
   */
  labelWidth?: CssLength;
  /** Side-by-side columns (default) or values stacked under their labels. */
  presentation?: ValueTablePresentation;
  /**
   * Stack the rows only while the table itself is narrower than the preset,
   * so one table reads as columns in a wide dialog and stacks on a phone.
   */
  stackBelow?: ValueTableStackBelow;
  className?: string;
  children: KerfUiContent;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export function ValueTable({
  label,
  density = 'default',
  labelWidth,
  presentation = 'columns',
  stackBelow,
  className = '',
  children,
  slot,
}: ValueTableProps) {
  return (
    <dl
      class={`kui-value-table ${className}`.trim()}
      data-component="value-table"
      data-density={density}
      data-presentation={presentation}
      data-stack-below={stackBelow}
      data-label-width={labelWidth === undefined ? undefined : ''}
      style={
        labelWidth === undefined
          ? undefined
          : `--_kui-value-table-label-min:${labelWidth}`
      }
      aria-label={label}
      slot={slot}
    >
      {children}
    </dl>
  );
}
