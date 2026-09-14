import type { SafeHtml } from 'kerfjs';

export interface ValueTableRowProps {
  label: string | SafeHtml;
  value: string | SafeHtml;
  icon?: SafeHtml;
  className?: string;
}

export function ValueTableRow({ label, value, icon, className = '' }: ValueTableRowProps) {
  return <div class={`kui-value-table__row ${className}`.trim()} data-has-icon={String(Boolean(icon))}>
    <dt>
      {icon && <span class="kui-value-table__icon">{icon}</span>}
      <span class="kui-value-table__label">{label}</span>
    </dt>
    <dd>{value}</dd>
  </div>;
}
