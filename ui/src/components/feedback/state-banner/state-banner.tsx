import type { SafeHtml } from 'kerfjs';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { em } from '../../../shared/styles/css-values.js';
import type { SemanticTone } from '../../../shared/styles/semantic-tone.js';
import { Badge } from '../badge/badge.js';
import { Skeleton } from '../skeleton/skeleton.js';

export type { SemanticTone } from '../../../shared/styles/semantic-tone.js';
/** @deprecated Use SemanticTone. */
export type StateBannerTone = SemanticTone;
export type StateBannerUrgency = 'status' | 'alert';
export type StateBannerCopyLayout = 'inline' | 'stacked';
export type StateBannerActionPlacement = 'trailing' | 'below';

export interface StateBannerProps {
  title: string;
  detail?: string;
  /** Optional compact status or count shown beside the title. */
  badge?: string;
  icon?: SafeHtml;
  action?: KerfUiContent;
  tone?: SemanticTone;
  urgency?: StateBannerUrgency;
  /** Keep the detail beside the title, or give it its own line. */
  copyLayout?: StateBannerCopyLayout;
  /** Place the action beside the copy or on a separate trailing row. */
  actionPlacement?: StateBannerActionPlacement;
  className?: string;
  /** Render the title, badge, and detail as unanimated loading skeletons, keeping the icon and tone. The detail line appears only when `detail` is set, as in the live banner. */
  placeholder?: boolean;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export function StateBanner({
  title,
  detail,
  badge,
  icon,
  action,
  tone = 'info',
  urgency = 'status',
  copyLayout = 'inline',
  actionPlacement = 'trailing',
  className = '',
  placeholder = false,
  slot,
}: StateBannerProps) {
  return (
    <section
      class={`kui-state-banner ${className}`.trim()}
      data-component="state-banner"
      data-tone={tone}
      data-copy-layout={copyLayout}
      data-action-placement={actionPlacement}
      data-placeholder={placeholder ? 'true' : undefined}
      role={urgency}
      aria-live={urgency === 'alert' ? 'assertive' : 'polite'}
      aria-busy={placeholder ? 'true' : undefined}
      slot={slot}
    >
      {icon && <span class="kui-state-banner__icon">{icon}</span>}
      <div class="kui-state-banner__copy">
        <strong>{placeholder ? <Skeleton width={em(10)} /> : title}</strong>
        {badge && (
          <Badge appearance="solid" size="compact" tone={tone}>
            {placeholder ? <Skeleton width={em(1.75)} /> : badge}
          </Badge>
        )}
        {detail && (
          <span class="kui-state-banner__detail">
            <span>{placeholder ? <Skeleton width={em(16)} /> : detail}</span>
          </span>
        )}
      </div>
      {action && <div class="kui-state-banner__action">{action}</div>}
    </section>
  );
}
