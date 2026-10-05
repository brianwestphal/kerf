import type { SafeHtml } from 'kerfjs';

import {
  filterControlAttributes,
  filterDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import { em } from '../../../shared/styles/css-values.js';
import type { HeadingLevel } from '../../actions/toolbar-text/toolbar-text.js';
import { Badge, type BadgeTone } from '../../feedback/badge/badge.js';
import { Skeleton } from '../../feedback/skeleton/skeleton.js';
import { DisclosureArrow } from '../../navigation/disclosure-arrow/disclosure-arrow.js';
import { Text } from '../../typography/text/text.js';

const PROTECTED_ROOT_DATA_ATTRIBUTES = new Set([
  'data-component',
  'data-action',
  'data-has-badge',
  'data-has-count',
  'data-density',
  'data-size',
  'data-divider',
  'data-inline',
  'data-width',
  'data-indicator-tone',
  'data-toggle',
]);
const PROTECTED_TRIGGER_DATA_ATTRIBUTES = new Set([
  'data-action',
  'data-kui-disabled',
]);

type ListHeaderRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-has-badge'?: never;
    'data-has-count'?: never;
    'data-density'?: never;
    'data-size'?: never;
    'data-divider'?: never;
    'data-inline'?: never;
    'data-width'?: never;
    'data-indicator-tone'?: never;
    'data-toggle'?: never;
  }
>;

type ListHeaderTriggerAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-action'?: never;
    'data-kui-disabled'?: never;
    popoverTarget?: string;
    popoverTargetAction?: 'toggle' | 'show' | 'hide';
    'aria-controls'?: string;
    'aria-haspopup'?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid' | 'true';
  }
>;

interface ListHeaderBaseProps {
  label: string;
  /** Visual label size, independent of the native heading level. Default `sm`. */
  size?: 'xs' | 'sm' | 'm' | 'l' | 'xl';
  density?: 'standard' | 'compact';
  divider?: 'none' | 'before' | 'after' | 'both';
  /** Shrink-wrap the header without its default outer margin, border, or padding. */
  inline?: boolean;
  /** Fill the available row or shrink-wrap while retaining normal header geometry. */
  width?: 'fill' | 'content';
  indicatorTone?: 'neutral' | 'accent' | 'pop' | 'danger';
  /** Render as an unanimated loading skeleton: keep the label and action affordance, disable interaction. */
  placeholder?: boolean;
  rootAttributes?: ListHeaderRootAttributes;
  triggerAttributes?: ListHeaderTriggerAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

type ListHeaderModeProps =
  | {
      /** Render the title as a controlled disclosure trigger. */
      toggle: true;
      /** A toggle's label is its button text, not a heading. */
      headingLevel?: never;
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
      /**
       * Native heading level (`h1`–`h6`) of the label. Default `2`. Match the
       * document outline; the visual treatment does not change.
       */
      headingLevel?: HeadingLevel;
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
      /**
       * Native heading level (`h1`–`h6`) of the label. Default `2`. Match the
       * document outline; the visual treatment does not change.
       */
      headingLevel?: HeadingLevel;
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
  size = 'sm',
  headingLevel = 2,
  count,
  countLabel,
  badge,
  status,
  density = 'standard',
  divider = 'none',
  inline = false,
  width = 'fill',
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
  slot,
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
  const badgeTone: BadgeTone =
    indicatorTone === 'accent' ? 'brand' : indicatorTone;
  const indicator = placeholder ? (
    (normalizedCount !== undefined || renderedBadge) && (
      <Badge size="compact" tone={badgeTone}>
        <Skeleton width={em(1.75)} />
      </Badge>
    )
  ) : normalizedCount === undefined ? (
    renderedBadge && (
      <Badge size="compact" tone={badgeTone}>
        {renderedBadge}
      </Badge>
    )
  ) : (
    <Badge size="compact" tone={badgeTone} ariaHidden>
      {normalizedCount}
    </Badge>
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
        data-size={size}
        data-divider={divider}
        data-inline={String(inline)}
        data-width={width}
        data-indicator-tone={indicatorTone}
        data-toggle="true"
        data-placeholder={placeholder ? 'true' : undefined}
        aria-busy={busy}
        slot={slot}
      >
        <button
          {...extensionTriggerAttributes}
          type="button"
          class="kui-list-header__title kui-list-header__toggle"
          data-action={placeholder ? undefined : action}
          title={actionDisabled ? disabledReason : undefined}
          disabled={actionDisabled || placeholder || undefined}
          data-kui-disabled={actionDisabled ? 'true' : undefined}
          aria-label={accessibleLabel}
          aria-expanded={String(Boolean(expanded))}
        >
          <Text variant="span">{label}</Text>
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
      data-size={size}
      data-divider={divider}
      data-inline={String(inline)}
      data-width={width}
      data-indicator-tone={indicatorTone}
      data-toggle="false"
      data-placeholder={placeholder ? 'true' : undefined}
      aria-busy={busy}
      slot={slot}
    >
      <div class="kui-list-header__title">
        <Text
          variant={`h${headingLevel}`}
          border="none"
          aria-label={accessibleLabel}
        >
          {label}
        </Text>
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
          data-kui-disabled={actionDisabled ? 'true' : undefined}
        >
          {renderedActionIcon}
        </button>
      )}
    </header>
  );
}
