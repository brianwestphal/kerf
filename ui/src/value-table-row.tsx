import type { SafeHtml } from 'kerfjs';

import { Skeleton } from './skeleton.js';

export interface ValueTableRowProps {
  label: string | SafeHtml;
  value: string | SafeHtml;
  icon?: SafeHtml;
  className?: string;
  /** Render the value as an unanimated loading skeleton, keeping the field label. */
  placeholder?: boolean;
}

export function ValueTableRow({ label, value, icon, className = '', placeholder = false }: ValueTableRowProps) {
  return <div class={`kui-value-table__row ${className}`.trim()} data-has-icon={String(Boolean(icon))} data-placeholder={placeholder ? 'true' : undefined}>
    <dt>
      {icon && <span class="kui-value-table__icon">{icon}</span>}
      <span class="kui-value-table__label">{label}</span>
    </dt>
    <dd>{placeholder ? <Skeleton width="10em" /> : value}</dd>
  </div>;
}
