import type { SafeHtml } from 'kerfjs';

import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../../shared/dom/extension-attributes.js';
import { em } from '../../../../shared/styles/css-values.js';
import { Skeleton } from '../../../feedback/skeleton/skeleton.js';

export interface ValueTableRowProps {
  label: string | SafeHtml;
  value: string | SafeHtml;
  icon?: SafeHtml;
  className?: string;
  /** Render the value as an unanimated loading skeleton, keeping the field label. */
  placeholder?: boolean;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const VALUE_TABLE_ROW_PROTECTED = new Set([
  'data-component',
  'data-has-icon',
  'data-placeholder',
]);

export function ValueTableRow({
  label,
  value,
  icon,
  className = '',
  placeholder = false,
  slot,
  rootAttributes = {},
}: ValueTableRowProps) {
  return (
    <div
      {...filterDataAttributes(rootAttributes, VALUE_TABLE_ROW_PROTECTED)}
      class={`kui-value-table__row ${className}`.trim()}
      data-has-icon={String(Boolean(icon))}
      data-placeholder={placeholder ? 'true' : undefined}
      slot={slot}
    >
      <dt>
        {icon && <span class="kui-value-table__icon">{icon}</span>}
        <span class="kui-value-table__label">{label}</span>
      </dt>
      <dd>{placeholder ? <Skeleton width={em(10)} /> : value}</dd>
    </div>
  );
}
