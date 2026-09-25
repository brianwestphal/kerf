import type { KerfUiContent } from './semantic-content.js';

export { ValueTableRow, type ValueTableRowProps } from './value-table-row.js';

export interface ValueTableProps {
  label: string;
  className?: string;
  children: KerfUiContent;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export function ValueTable({
  label,
  className = '',
  children,
  slot,
}: ValueTableProps) {
  return (
    <dl
      class={`kui-value-table ${className}`.trim()}
      data-component="value-table"
      aria-label={label}
      slot={slot}
    >
      {children}
    </dl>
  );
}
