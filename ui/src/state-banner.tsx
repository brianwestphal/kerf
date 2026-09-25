import type { SafeHtml } from 'kerfjs';

import { Badge } from './badge.js';
import { em } from './css-values.js';
import type { KerfUiContent } from './semantic-content.js';
import { Skeleton } from './skeleton.js';

export type StateBannerTone =
  'neutral' | 'info' | 'pop' | 'success' | 'warning' | 'danger';
export type StateBannerUrgency = 'status' | 'alert';

export interface StateBannerProps {
  title: string;
  detail?: string;
  /** Optional compact status or count shown beside the title. */
  badge?: string;
  icon?: SafeHtml;
  action?: KerfUiContent;
  tone?: StateBannerTone;
  urgency?: StateBannerUrgency;
  className?: string;
  /** Render the title, badge, and detail as unanimated loading skeletons, keeping the icon and tone. */
  placeholder?: boolean;
}

export function StateBanner({
  title,
  detail,
  badge,
  icon,
  action,
  tone = 'info',
  urgency = 'status',
  className = '',
  placeholder = false,
}: StateBannerProps) {
  const badgeTone = tone === 'info' ? 'brand' : tone;
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
        <strong>{placeholder ? <Skeleton width={em(10)} /> : title}</strong>
        {badge && (
          <Badge appearance="solid" size="compact" tone={badgeTone}>
            {placeholder ? <Skeleton width={em(1.75)} /> : badge}
          </Badge>
        )}
        {(placeholder || detail) && (
          <span class="kui-state-banner__detail">
            {placeholder ? <Skeleton width={em(16)} /> : detail}
          </span>
        )}
      </div>
      {action && <div class="kui-state-banner__action">{action}</div>}
    </section>
  );
}
