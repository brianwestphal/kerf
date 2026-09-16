import type { SafeHtml } from 'kerfjs';

// Import (not just re-export) so the browser-entry CSS scanner follows the row to
// its Skeleton dependency, keeping placeholder styles reachable from this subpath.
import { ValueTableRow, type ValueTableRowProps } from './value-table-row.js';

export { ValueTableRow, type ValueTableRowProps };

export interface ValueTableProps {
  label: string;
  className?: string;
  children: SafeHtml | readonly SafeHtml[];
}

export function ValueTable({ label, className = '', children }: ValueTableProps) {
  return <dl class={`kui-value-table ${className}`.trim()} data-component="value-table" aria-label={label}>{children}</dl>;
}
