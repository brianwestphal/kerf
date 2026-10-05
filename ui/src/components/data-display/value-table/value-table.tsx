import type { KerfUiContent } from '../../../shared/content/semantic-content.js';

export {
  ValueTableRow,
  type ValueTableRowProps,
} from './internal/value-table-row.js';

export interface ValueTableProps {
  label: string;
  /** Compact row spacing for metadata-dense surfaces. */
  density?: 'default' | 'compact';
  className?: string;
  children: KerfUiContent;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export function ValueTable({
  label,
  density = 'default',
  className = '',
  children,
  slot,
}: ValueTableProps) {
  return (
    <dl
      class={`kui-value-table ${className}`.trim()}
      data-component="value-table"
      data-density={density}
      aria-label={label}
      slot={slot}
    >
      {children}
    </dl>
  );
}
