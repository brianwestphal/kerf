import type { SafeHtml } from 'kerfjs';

import { LoadingSpinner } from './loading-spinner.js';

export interface EmptyStateProps {
  title: string;
  detail?: string;
  icon?: SafeHtml;
  action?: SafeHtml;
  busy?: boolean;
  className?: string;
}

export function EmptyState({ title, detail, icon, action, busy = false, className = '' }: EmptyStateProps) {
  return <section class={`kui-empty-state ${className}`.trim()} data-component="empty-state" data-busy={String(busy)} role="status" aria-busy={String(busy)}>
    <div class="kui-empty-state__icon">{busy ? <LoadingSpinner /> : icon}</div>
    <strong>{title}</strong>
    {detail && <span>{detail}</span>}
    {action && <div class="kui-empty-state__action">{action}</div>}
  </section>;
}
