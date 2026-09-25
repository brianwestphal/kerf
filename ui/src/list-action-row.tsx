import type { SafeHtml } from 'kerfjs';

import { em } from './css-values.js';
import {
  filterControlAttributes,
  filterDataAttributes,
} from './extension-attributes.js';
import { LoadingSpinner } from './loading-spinner.js';
import { Skeleton } from './skeleton.js';

const PROTECTED_ROOT_DATA_ATTRIBUTES = new Set([
  'data-component',
  'data-action',
  'data-item-id',
  'data-has-icon',
  'data-multiline',
  'data-density',
  'data-divider',
  'data-busy',
  'data-trailing-visibility',
  'data-state',
  'data-selected',
  'data-pressed',
]);
const PROTECTED_TRAILING_DATA_ATTRIBUTES = new Set([
  'data-component',
  'data-action',
  'data-item-id',
]);

type ListActionRowRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-has-icon'?: never;
    'data-multiline'?: never;
    'data-density'?: never;
    'data-divider'?: never;
    'data-busy'?: never;
    'data-trailing-visibility'?: never;
    'data-state'?: never;
    'data-selected'?: never;
    'data-pressed'?: never;
  }
>;

type ListActionRowTrailingAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    popoverTarget?: string;
    popoverTargetAction?: 'toggle' | 'show' | 'hide';
    'aria-controls'?: string;
    'aria-haspopup'?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid' | 'true';
  }
>;

export interface ListActionRowProps {
  /** Visible dormant content for the primary button. Must not contain interactive descendants. */
  label: string | SafeHtml;
  description?: string | SafeHtml;
  status?: string | SafeHtml;
  busy?: boolean;
  density?: 'standard' | 'compact';
  divider?: 'none' | 'before' | 'after' | 'both';
  /** Decorative dormant content for the primary button. Must not contain interactive descendants. */
  icon?: SafeHtml;
  action: string;
  itemId?: string;
  selected?: boolean;
  pressed?: boolean;
  accessibleLabel?: string;
  title?: string;
  multiline?: boolean;
  state?: string;
  disabled?: boolean;
  tabIndex?: number;
  /** Render as an unanimated loading skeleton, disabling both actions. */
  placeholder?: boolean;
  trailingAction: string;
  trailingActionLabel: string;
  /** Decorative dormant content for the trailing button. Must not contain interactive descendants. */
  trailingActionIcon: SafeHtml;
  trailingActionDisabled?: boolean;
  trailingActionTitle?: string;
  trailingActionVisibility?: 'always' | 'interaction';
  className?: string;
  rootAttributes?: ListActionRowRootAttributes;
  trailingActionAttributes?: ListActionRowTrailingAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export function ListActionRow({
  label,
  description,
  status,
  busy = false,
  density = 'standard',
  divider = 'none',
  icon,
  action,
  itemId,
  selected = false,
  pressed,
  accessibleLabel,
  title,
  multiline = false,
  state,
  disabled = false,
  tabIndex,
  placeholder = false,
  trailingAction,
  trailingActionLabel,
  trailingActionIcon,
  trailingActionDisabled = false,
  trailingActionTitle,
  trailingActionVisibility = 'always',
  className = '',
  rootAttributes = {},
  trailingActionAttributes = {},
  slot,
}: ListActionRowProps) {
  const extensionRootAttributes = filterDataAttributes(
    rootAttributes,
    PROTECTED_ROOT_DATA_ATTRIBUTES,
  );
  const extensionTrailingAttributes = filterControlAttributes(
    trailingActionAttributes,
    PROTECTED_TRAILING_DATA_ATTRIBUTES,
  );

  return (
    <div
      {...extensionRootAttributes}
      class={`kui-list-action-row ${className}`.trim()}
      data-component="list-action-row"
      data-item-id={itemId}
      data-has-icon={String(Boolean(icon))}
      data-multiline={multiline ? 'true' : undefined}
      data-density={density}
      data-divider={divider}
      data-busy={busy ? 'true' : undefined}
      data-trailing-visibility={trailingActionVisibility}
      data-state={state}
      data-selected={String(selected)}
      data-pressed={pressed === undefined ? undefined : String(pressed)}
      data-placeholder={placeholder ? 'true' : undefined}
      aria-busy={placeholder || busy ? 'true' : undefined}
      slot={slot}
    >
      <button
        type="button"
        class="kui-list-action-row__primary"
        title={placeholder ? undefined : title}
        disabled={disabled || placeholder}
        tabindex={placeholder ? -1 : tabIndex}
        data-action={placeholder ? undefined : action}
        data-item-id={itemId}
        aria-label={accessibleLabel}
        aria-current={selected ? 'page' : undefined}
        aria-pressed={pressed === undefined ? undefined : String(pressed)}
      >
        {icon && (
          <span class="kui-list-action-row__icon">
            {placeholder ? <Skeleton width={em(1)} height={em(1)} /> : icon}
          </span>
        )}
        <span class="kui-list-action-row__label">
          <span class="kui-list-action-row__primary-label">
            {placeholder ? <Skeleton width={em(9)} /> : label}
          </span>
          {!placeholder && description && (
            <span class="kui-list-action-row__description">{description}</span>
          )}
          {!placeholder && (busy || status) && (
            <span class="kui-list-action-row__status">
              {busy && <LoadingSpinner />}
              {status}
            </span>
          )}
        </span>
      </button>
      <button
        {...extensionTrailingAttributes}
        type="button"
        class="kui-list-action-row__trailing-action"
        data-action={placeholder ? undefined : trailingAction}
        data-item-id={itemId}
        aria-label={trailingActionLabel}
        title={trailingActionTitle ?? trailingActionLabel}
        disabled={trailingActionDisabled || placeholder || undefined}
      >
        {trailingActionIcon}
      </button>
    </div>
  );
}
