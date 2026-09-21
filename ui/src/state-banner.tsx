import type { SafeHtml } from 'kerfjs';

import { Skeleton } from './skeleton.js';

export type StateBannerTone =
  'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface StateBannerProps {
  title: string;
  detail?: string;
  icon?: SafeHtml;
  action?: SafeHtml;
  tone?: StateBannerTone;
  urgency?: 'status' | 'alert';
  className?: string;
  /** Render the title and detail as unanimated loading skeletons, keeping the icon and tone. */
  placeholder?: boolean;
}

export function StateBanner({
  title,
  detail,
  icon,
  action,
  tone = 'info',
  urgency = 'status',
  className = '',
  placeholder = false,
}: StateBannerProps) {
  return (
    <section
      class={`kui-state-banner ${className}`.trim()}
      data-component="state-banner"
      data-tone={tone}
      data-placeholder={placeholder ? 'true' : undefined}
      role={urgency}
      aria-live={urgency === 'alert' ? 'assertive' : 'polite'}
      aria-busy={placeholder ? 'true' : undefined}
    >
      {icon && <span class="kui-state-banner__icon">{icon}</span>}
      <div class="kui-state-banner__copy">
        <strong>{placeholder ? <Skeleton width="10em" /> : title}</strong>
        {(placeholder || detail) && (
          <span>{placeholder ? <Skeleton width="16em" /> : detail}</span>
        )}
      </div>
      {action && <div class="kui-state-banner__action">{action}</div>}
    </section>
  );
}
