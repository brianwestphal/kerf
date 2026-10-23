import type { SafeHtml } from 'kerfjs';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import type { Sides } from '../../../shared/layout/sides.js';
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
export type StateBannerPresentation = 'card' | 'strip';

const STATE_BANNER_PROTECTED = new Set([
  'data-component',
  'data-tone',
  'data-copy-layout',
  'data-action-placement',
  'data-presentation',
  'data-placeholder',
]);

/** Application `data-*` identity on the banner root; component markers stay protected. */
export type StateBannerRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-tone'?: never;
    'data-copy-layout'?: never;
    'data-action-placement'?: never;
    'data-presentation'?: never;
    'data-placeholder'?: never;
  }
>;

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
  /**
   * `trailing` (the default) puts the action beside the copy while the copy
   * keeps its minimum readable width, and otherwise wraps it onto its own
   * end-aligned trailing row, at any viewport or container width. `below`
   * always gives the action that separate trailing row.
   */
  actionPlacement?: StateBannerActionPlacement;
  /**
   * `card` (the default) is an inset, rounded, fully bordered banner beside
   * the affected work. `strip` is a full-width band at a layout edge, such as
   * above a workspace: square corners, no inline margin, inline padding on the
   * shared content-text column, and only the tone-colored `dividerSides` edges.
   */
  presentation?: StateBannerPresentation;
  /**
   * Physical tone-colored divider edges of a `strip`, in canonical
   * top/right/bottom/left order. Defaults to the bottom edge; `''` draws none.
   * A `card` keeps its full border and ignores this.
   */
  dividerSides?: Sides;
  className?: string;
  /** Safe `data-*` identity, such as `data-key` for conditional siblings. */
  rootAttributes?: StateBannerRootAttributes;
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
  presentation = 'card',
  dividerSides = 'b',
  className = '',
  rootAttributes = {},
  placeholder = false,
  slot,
}: StateBannerProps) {
  return (
    <section
      {...filterDataAttributes(rootAttributes, STATE_BANNER_PROTECTED)}
      class={`kui-state-banner ${className}`.trim()}
      data-component="state-banner"
      data-tone={tone}
      data-copy-layout={copyLayout}
      data-action-placement={actionPlacement}
      data-presentation={presentation}
      divider-sides={
        presentation === 'strip' ? dividerSides || undefined : undefined
      }
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
