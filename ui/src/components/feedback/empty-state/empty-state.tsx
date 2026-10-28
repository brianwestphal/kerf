import type { SafeHtml } from 'kerfjs';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import { LoadingSpinner } from '../loading-spinner/loading-spinner.js';

export interface EmptyStateProps {
  title: string;
  detail?: string;
  icon?: SafeHtml;
  action?: KerfUiContent;
  busy?: boolean;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const EMPTY_STATE_PROTECTED = new Set(['data-busy', 'data-component']);

export function EmptyState({
  title,
  detail,
  icon,
  action,
  busy = false,
  className = '',
  slot,
  rootAttributes = {},
}: EmptyStateProps) {
  return (
    <section
      {...filterDataAttributes(rootAttributes, EMPTY_STATE_PROTECTED)}
      class={`kui-empty-state ${className}`.trim()}
      data-component="empty-state"
      data-busy={String(busy)}
      role="status"
      aria-busy={String(busy)}
      slot={slot}
    >
      <div class="kui-empty-state__icon">
        {busy ? <LoadingSpinner /> : icon}
      </div>
      <strong>{title}</strong>
      {detail && <span>{detail}</span>}
      {action && <div class="kui-empty-state__action">{action}</div>}
    </section>
  );
}
