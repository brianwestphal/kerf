import type { SafeHtml } from 'kerfjs';

export interface ValueTableProps {
  label: string;
  className?: string;
  children: SafeHtml | SafeHtml[];
}

export function ValueTable({ label, className = '', children }: ValueTableProps) {
  return <dl class={`kui-value-table ${className}`.trim()} data-component="value-table" aria-label={label}>{children}</dl>;
}
