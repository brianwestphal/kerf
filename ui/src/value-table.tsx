import type { KerfUiContent } from './semantic-content.js';

export { ValueTableRow, type ValueTableRowProps } from './value-table-row.js';

export interface ValueTableProps {
  label: string;
  className?: string;
  children: KerfUiContent;
}

export function ValueTable({
  label,
  className = '',
  children,
}: ValueTableProps) {
  return (
    <dl
      class={`kui-value-table ${className}`.trim()}
      data-component="value-table"
      aria-label={label}
    >
      {children}
    </dl>
  );
}
