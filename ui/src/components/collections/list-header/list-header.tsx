import type { SafeHtml } from 'kerfjs';

import {
  filterControlAttributes,
  filterDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import { em } from '../../../shared/styles/css-values.js';
import type { SemanticTone } from '../../../shared/styles/semantic-tone.js';
import type { HeadingLevel } from '../../actions/toolbar-text/toolbar-text.js';
import { Badge } from '../../feedback/badge/badge.js';
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
  'data-wrap',
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
    'data-wrap'?: never;
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
  density?: 'default' | 'compact' | /** @deprecated Use default. */ 'standard';
  divider?: 'none' | 'before' | 'after' | 'both';
  /** Shrink-wrap the header without its default outer margin, border, or padding. */
  inline?: boolean;
  /** Fill the available row or shrink-wrap while retaining normal header geometry. */
  width?: 'fill' | 'content';
  /**
   * Wrap a long label onto further lines instead of truncating it to one
   * ellipsized line. Default false. Use it where the whole label must stay
   * readable in a narrow column, such as a specimen or form-section heading.
   */
  wrap?: boolean;
  indicatorTone?: 'neutral' | 'accent' | 'pop' | 'danger';
  /** Render as an unanimated loading skeleton: keep the label and action affordance, disable interaction. */
  placeholder?: boolean;
  rootAttributes?: ListHeaderRootAttributes;
  triggerAttributes?: ListHeaderTriggerAttributes;
  /**
   * The id of the region the header's toggle or action shows or hides,
   * reported as `aria-controls` on its trigger.
   */
  controls?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A toggle header's one trailing overflow button (KF-X2MRCT): its own focus
 * stop at the logical end, outside the disclosure button, opening the
 * section's commands. The label and arrow toggle the section; the overflow
 * button never does.
 */
type ListHeaderOverflowProps =
  | {
      /** The overflow button's `data-action`. */
      overflowAction: string;
      /** Its accessible name and tooltip ("Group actions"). */
      overflowLabel: string;
      /** Its icon, typically an `Ellipsis` `LucideIcon`. */
      overflowIcon: SafeHtml;
      overflowDisabled?: boolean;
      /**
       * Popup metadata for the overflow button (`popoverTarget`,
       * `aria-haspopup`, `aria-controls`, `data-*`).
       */
      overflowTriggerAttributes?: ListHeaderTriggerAttributes;
    }
  | {
      overflowAction?: never;
      overflowLabel?: never;
      overflowIcon?: never;
      overflowDisabled?: never;
      overflowTriggerAttributes?: never;
    };

/** The non-toggle modes take no overflow button. */
type ListHeaderNoOverflow = {
  overflowAction?: never;
  overflowLabel?: never;
  overflowIcon?: never;
  overflowDisabled?: never;
  overflowTriggerAttributes?: never;
};

type ListHeaderModeProps =
  | ({
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
    } & ListHeaderOverflowProps)
  | ({
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
    } & ListHeaderNoOverflow)
  | ({
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
    } & ListHeaderNoOverflow);

type ListHeaderIndicatorProps =
  | { count: number; countLabel: string; badge?: never; status?: never }
  | {
      count?: never;
      countLabel?: never;
      /** Non-count indicator text or content; ListHeader wraps it in its own compact Badge. */
      badge?: string | SafeHtml | undefined;
      /** Status text or content, wrapped in its own compact Badge after `badge`. */
      status?: string | SafeHtml | undefined;
    };

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
  density = 'default',
  divider = 'none',
  inline = false,
  width = 'fill',
  wrap = false,
  indicatorTone = 'neutral',
  action,
  actionLabel,
  actionIcon,
  actionDisabled = false,
  disabledReason,
  expanded,
  toggle = false,
  overflowAction,
  overflowLabel,
  overflowIcon,
  overflowDisabled = false,
  overflowTriggerAttributes = {},
  placeholder = false,
  rootAttributes = {},
  triggerAttributes = {},
  controls,
  slot,
}: ListHeaderProps) {
  const extensionRootAttributes = filterDataAttributes(
    rootAttributes,
    PROTECTED_ROOT_DATA_ATTRIBUTES,
  );
  const extensionTriggerAttributes = {
    ...filterControlAttributes(
      triggerAttributes,
      PROTECTED_TRIGGER_DATA_ATTRIBUTES,
    ),
    ...(controls === undefined ? {} : { 'aria-controls': controls }),
  };
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
  const renderedBadge = normalizedCount === undefined ? badge : undefined;
  const renderedStatus = normalizedCount === undefined ? status : undefined;
  const hasBadge = Boolean(renderedBadge || renderedStatus);
  const renderedActionIcon =
    actionIcon ??
    (toggle ? <DisclosureArrow open={Boolean(expanded)} /> : undefined);
  const accessibleLabel =
    normalizedCount === undefined
      ? undefined
      : `${label}, ${normalizedCountLabel}`;
  const badgeTone: SemanticTone =
    indicatorTone === 'accent' ? 'info' : indicatorTone;
  const indicator =
    normalizedCount !== undefined ? (
      <Badge size="compact" tone={badgeTone} ariaHidden={!placeholder}>
        {placeholder ? <Skeleton width={em(1.75)} /> : normalizedCount}
      </Badge>
    ) : (
      <>
        {renderedBadge && (
          <Badge size="compact" tone={badgeTone}>
            {placeholder ? <Skeleton width={em(1.75)} /> : renderedBadge}
          </Badge>
        )}
        {renderedStatus && (
          <Badge size="compact" tone={badgeTone}>
            {placeholder ? <Skeleton width={em(1.75)} /> : renderedStatus}
          </Badge>
        )}
      </>
    );
  const busy = placeholder ? ('true' as const) : undefined;
  if (toggle) {
    return (
      <header
        {...extensionRootAttributes}
        class="kui-list-header"
        data-component="list-header"
        data-has-badge={String(hasBadge)}
        data-has-count={String(normalizedCount !== undefined)}
        data-density={density === 'standard' ? 'default' : density}
        data-size={size}
        data-divider={divider}
        data-inline={String(inline)}
        data-width={width}
        data-wrap={wrap ? 'true' : undefined}
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
        {overflowAction && (
          <button
            {...filterControlAttributes(
              overflowTriggerAttributes,
              PROTECTED_TRIGGER_DATA_ATTRIBUTES,
            )}
            type="button"
            class="kui-list-header__action"
            data-list-header-overflow="true"
            data-action={placeholder ? undefined : overflowAction}
            aria-label={overflowLabel}
            title={overflowLabel}
            disabled={overflowDisabled || placeholder || undefined}
            data-kui-disabled={overflowDisabled ? 'true' : undefined}
          >
            {overflowIcon}
          </button>
        )}
      </header>
    );
  }
  return (
    <header
      {...extensionRootAttributes}
      class="kui-list-header"
      data-component="list-header"
      data-has-badge={String(hasBadge)}
      data-has-count={String(normalizedCount !== undefined)}
      data-density={density === 'standard' ? 'default' : density}
      data-size={size}
      data-divider={divider}
      data-inline={String(inline)}
      data-width={width}
      data-wrap={wrap ? 'true' : undefined}
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
