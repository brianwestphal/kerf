import type { SafeHtml } from 'kerfjs';

import { em } from './css-values.js';
import { DisclosureArrow } from './disclosure-arrow.js';
import {
  filterControlAttributes,
  filterDataAttributes,
} from './extension-attributes.js';
import { Skeleton } from './skeleton.js';

const PROTECTED_ROOT_DATA_ATTRIBUTES = new Set([
  'data-component',
  'data-action',
  'data-has-badge',
  'data-has-count',
  'data-density',
  'data-divider',
  'data-indicator-tone',
  'data-toggle',
]);
const PROTECTED_TRIGGER_DATA_ATTRIBUTES = new Set(['data-action']);

type ListHeaderRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-has-badge'?: never;
    'data-has-count'?: never;
    'data-density'?: never;
    'data-divider'?: never;
    'data-indicator-tone'?: never;
    'data-toggle'?: never;
  }
>;

type ListHeaderTriggerAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-action'?: never;
    popoverTarget?: string;
    popoverTargetAction?: 'toggle' | 'show' | 'hide';
    'aria-controls'?: string;
    'aria-haspopup'?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid' | 'true';
  }
>;

interface ListHeaderBaseProps {
  label: string;
  density?: 'standard' | 'compact';
  divider?: 'none' | 'before' | 'after' | 'both';
  indicatorTone?: 'neutral' | 'accent' | 'pop' | 'danger';
  /** Render as an unanimated loading skeleton: keep the label and action affordance, disable interaction. */
  placeholder?: boolean;
  rootAttributes?: ListHeaderRootAttributes;
  triggerAttributes?: ListHeaderTriggerAttributes;
}

type ListHeaderModeProps =
  | {
      /** Render the title as a controlled disclosure trigger. */
      toggle: true;
      action: string;
      expanded: boolean;
      actionIcon?: SafeHtml;
      actionLabel?: never;
      actionDisabled?: boolean;
      disabledReason?: string;
    }
  | {
      /** Render a separately named trailing action. */
      toggle?: false;
      action: string;
      actionLabel: string;
      actionIcon: SafeHtml;
      expanded?: never;
      actionDisabled?: boolean;
      disabledReason?: string;
    }
  | {
      /** Render a passive section heading. */
      toggle?: false;
      action?: never;
      actionLabel?: never;
      actionIcon?: never;
      expanded?: never;
      actionDisabled?: never;
      disabledReason?: never;
    };

type ListHeaderIndicatorProps =
  | { count: number; countLabel: string; badge?: never; status?: never }
  | { count?: never; countLabel?: never; badge: SafeHtml; status?: never }
  | { count?: never; countLabel?: never; badge?: never; status?: SafeHtml };

export type ListHeaderProps = ListHeaderBaseProps &
  ListHeaderIndicatorProps &
  ListHeaderModeProps;

export function ListHeader({
  label,
  count,
  countLabel,
  badge,
  status,
  density = 'standard',
  divider = 'none',
  indicatorTone = 'neutral',
  action,
  actionLabel,
  actionIcon,
  actionDisabled = false,
  disabledReason,
  expanded,
  toggle = false,
  placeholder = false,
  rootAttributes = {},
  triggerAttributes = {},
}: ListHeaderProps) {
  const extensionRootAttributes = filterDataAttributes(
    rootAttributes,
    PROTECTED_ROOT_DATA_ATTRIBUTES,
  );
  const extensionTriggerAttributes = filterControlAttributes(
    triggerAttributes,
    PROTECTED_TRIGGER_DATA_ATTRIBUTES,
  );
  const normalizedCount =
    typeof count === 'number' && Number.isSafeInteger(count) && count >= 0
      ? count
      : undefined;
  const normalizedCountLabel =
    normalizedCount === undefined
      ? undefined
      : typeof countLabel === 'string' && countLabel.trim()
        ? countLabel
        : String(normalizedCount);
  const renderedBadge =
    normalizedCount === undefined ? (status ?? badge) : undefined;
  const renderedActionIcon =
    actionIcon ??
    (toggle ? <DisclosureArrow open={Boolean(expanded)} /> : undefined);
  const accessibleLabel =
    normalizedCount === undefined
      ? undefined
      : `${label}, ${normalizedCountLabel}`;
  const indicator = placeholder ? (
    (normalizedCount !== undefined || renderedBadge) && (
      <span class="kui-list-header__badge">
        <Skeleton width={em(1.75)} />
      </span>
    )
  ) : normalizedCount === undefined ? (
    renderedBadge && <span class="kui-list-header__badge">{renderedBadge}</span>
  ) : (
    <span class="kui-list-header__count" aria-hidden="true">
      {normalizedCount}
    </span>
  );
  const busy = placeholder ? ('true' as const) : undefined;
  if (toggle) {
    return (
      <header
        {...extensionRootAttributes}
        class="kui-list-header"
        data-component="list-header"
        data-has-badge={String(Boolean(renderedBadge))}
        data-has-count={String(normalizedCount !== undefined)}
        data-density={density}
        data-divider={divider}
        data-indicator-tone={indicatorTone}
        data-toggle="true"
        data-placeholder={placeholder ? 'true' : undefined}
        aria-busy={busy}
      >
        <button
          {...extensionTriggerAttributes}
          type="button"
          class="kui-list-header__title kui-list-header__toggle"
          data-action={placeholder ? undefined : action}
          title={actionDisabled ? disabledReason : undefined}
          disabled={actionDisabled || placeholder || undefined}
          aria-label={accessibleLabel}
          aria-expanded={String(Boolean(expanded))}
        >
          <span class="kui-list-header__label">{label}</span>
          {indicator}
          {renderedActionIcon && (
            <span class="kui-list-header__action-layer">
              {renderedActionIcon}
            </span>
          )}
        </button>
      </header>
    );
  }
  return (
    <header
      {...extensionRootAttributes}
      class="kui-list-header"
      data-component="list-header"
      data-has-badge={String(Boolean(renderedBadge))}
      data-has-count={String(normalizedCount !== undefined)}
      data-density={density}
      data-divider={divider}
      data-indicator-tone={indicatorTone}
      data-toggle="false"
      data-placeholder={placeholder ? 'true' : undefined}
      aria-busy={busy}
    >
      <div class="kui-list-header__title">
        <h2 class="kui-list-header__label" aria-label={accessibleLabel}>
          {label}
        </h2>
        {indicator}
      </div>
      {action && (
        <button
          {...extensionTriggerAttributes}
          type="button"
          class="kui-list-header__action"
          data-action={placeholder ? undefined : action}
          aria-label={actionLabel}
          title={actionDisabled ? disabledReason : actionLabel}
          disabled={actionDisabled || placeholder || undefined}
        >
          {renderedActionIcon}
        </button>
      )}
    </header>
  );
}
