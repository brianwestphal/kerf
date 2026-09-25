import type { SafeHtml } from 'kerfjs';

import { LoadingSpinner } from './loading-spinner.js';
import type { KerfUiContent } from './semantic-content.js';

export interface EmptyStateProps {
  title: string;
  detail?: string;
  icon?: SafeHtml;
  action?: KerfUiContent;
  busy?: boolean;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export function EmptyState({
  title,
  detail,
  icon,
  action,
  busy = false,
  className = '',
  slot,
}: EmptyStateProps) {
  return (
    <section
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
