import type { SafeHtml } from 'kerfjs';

import { em } from './css-values.js';
import { filterDataAttributes } from './extension-attributes.js';
import { LoadingSpinner } from './loading-spinner.js';
import type { KerfUiContent } from './semantic-content.js';
import { Skeleton } from './skeleton.js';

const PROTECTED_ROOT_DATA_ATTRIBUTES = new Set([
  'data-component',
  'data-action',
  'data-item-id',
  'data-has-icon',
  'data-has-description',
  'data-multiline',
  'data-density',
  'data-divider',
  'data-busy',
  'data-state',
]);

type ListItemRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-has-icon'?: never;
    'data-has-description'?: never;
    'data-multiline'?: never;
    'data-density'?: never;
    'data-divider'?: never;
    'data-busy'?: never;
    'data-state'?: never;
  }
>;

export interface ListItemProps {
  label: string | SafeHtml;
  /** App-owned supporting text rendered in the component's stable label stack. */
  description?: string | SafeHtml;
  icon?: SafeHtml;
  trailing?: KerfUiContent;
  /** Dormant status metadata rendered before trailing content. */
  status?: string | SafeHtml;
  /** Show a progress indicator and expose the row as busy without replacing its content. */
  busy?: boolean;
  density?: 'standard' | 'compact';
  divider?: 'none' | 'before' | 'after' | 'both';
  selected?: boolean;
  action: string;
  itemId?: string;
  className?: string;
  pressed?: boolean;
  accessibleLabel?: string;
  title?: string;
  multiline?: boolean;
  state?: string;
  disabled?: boolean;
  tabIndex?: number;
  /** Render the row as an unanimated loading skeleton, disabling its action. */
  placeholder?: boolean;
  rootAttributes?: ListItemRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export function ListItem({
  label,
  description,
  icon,
  trailing,
  status,
  busy = false,
  density = 'standard',
  divider = 'none',
  selected = false,
  action,
  itemId,
  className = '',
  pressed,
  accessibleLabel,
  title,
  multiline = false,
  state,
  disabled = false,
  tabIndex,
  placeholder = false,
  rootAttributes = {},
  slot,
}: ListItemProps) {
  const extensionAttributes = filterDataAttributes(
    rootAttributes,
    PROTECTED_ROOT_DATA_ATTRIBUTES,
  );
  return (
    <button
      {...extensionAttributes}
      type="button"
      class={`kui-list-item ${className}`.trim()}
      title={placeholder ? undefined : title}
      disabled={disabled || placeholder}
      tabindex={placeholder ? -1 : tabIndex}
      data-component="list-item"
      data-action={placeholder ? undefined : action}
      data-item-id={itemId}
      data-has-icon={String(Boolean(icon))}
      data-has-description={String(Boolean(description))}
      data-multiline={multiline ? 'true' : undefined}
      data-density={density}
      data-divider={divider}
      data-busy={busy ? 'true' : undefined}
      data-state={state}
      data-placeholder={placeholder ? 'true' : undefined}
      aria-label={accessibleLabel}
      aria-current={selected ? 'page' : undefined}
      aria-pressed={pressed === undefined ? undefined : String(pressed)}
      aria-busy={placeholder || busy ? 'true' : undefined}
      slot={slot}
    >
      {icon && (
        <span class="kui-list-item__icon">
          {placeholder ? <Skeleton width={em(1)} height={em(1)} /> : icon}
        </span>
      )}
      <span class="kui-list-item__label">
        <span class="kui-list-item__primary-label">
          {placeholder ? <Skeleton width={em(9)} /> : label}
        </span>
        {!placeholder && description && (
          <span class="kui-list-item__description">{description}</span>
        )}
      </span>
      {(busy || status || trailing) && (
        <span class="kui-list-item__trailing">
          {placeholder ? (
            <Skeleton width={em(2.5)} />
          ) : (
            <>
              {busy && <LoadingSpinner />}
              {status && <span class="kui-list-item__status">{status}</span>}
              {trailing}
            </>
          )}
        </span>
      )}
    </button>
  );
}
