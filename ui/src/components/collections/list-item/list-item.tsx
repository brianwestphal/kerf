import type { SafeHtml } from 'kerfjs';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import { em, remify } from '../../../shared/styles/css-values.js';
import { withWordBreaks } from '../../../shared/text/word-breaks.js';
import { LoadingSpinner } from '../../feedback/loading-spinner/loading-spinner.js';
import { Skeleton } from '../../feedback/skeleton/skeleton.js';

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
  'data-kui-disabled',
  'data-icon-align',
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
    'data-kui-disabled'?: never;
    'data-icon-align'?: never;
  }
>;

export interface ListItemProps {
  label: string | SafeHtml;
  /** App-owned supporting text rendered in the component's stable label stack. */
  description?: string | SafeHtml;
  icon?: SafeHtml;
  /** Dormant author content at the row's end; a placeholder renders it as a skeleton. */
  trailing?: KerfUiContent;
  /** Dormant status metadata rendered before trailing content; a placeholder renders it as a skeleton. */
  status?: string | SafeHtml;
  /** Show a progress indicator and expose the row as busy without replacing its content; a placeholder keeps the indicator. */
  busy?: boolean;
  density?: 'standard' | 'compact' | 'spacious';
  divider?: 'none' | 'before' | 'after' | 'both';
  selected?: boolean;
  action: string;
  itemId?: string;
  className?: string;
  pressed?: boolean;
  accessibleLabel?: string;
  title?: string;
  multiline?: boolean;
  /** Alignment of an icon beside a wrapped label. Defaults to its first line. */
  multilineIconAlign?: 'first-line' | 'center';
  state?: string;
  disabled?: boolean;
  tabIndex?: number;
  /** Render the row as an unanimated loading skeleton, disabling its action: label, description, icon, status, and trailing content become skeletons; the `busy` indicator stays live. */
  placeholder?: boolean;
  rootAttributes?: ListItemRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export interface ListItemLinkProps extends Omit<
  ListItemProps,
  'action' | 'pressed'
> {
  /** Native destination for this navigation row. */
  href: string;
  /** Open in a new tab with a safe rel and announce that behavior. */
  external?: boolean;
  action?: never;
  pressed?: never;
}

function listItemContent({
  label,
  description,
  icon,
  trailing,
  status,
  busy = false,
  multiline = false,
  placeholder = false,
}: Pick<
  ListItemProps,
  | 'label'
  | 'description'
  | 'icon'
  | 'trailing'
  | 'status'
  | 'busy'
  | 'multiline'
  | 'placeholder'
>) {
  return (
    <>
      {icon && (
        <span class="kui-list-item__icon">
          {placeholder ? (
            <Skeleton block width={remify(18)} height={remify(18)} />
          ) : (
            icon
          )}
        </span>
      )}
      <span class="kui-list-item__label">
        <span class="kui-list-item__primary-label">
          {placeholder ? (
            <Skeleton width={em(9)} />
          ) : multiline ? (
            withWordBreaks(label)
          ) : (
            label
          )}
        </span>
        {description && (
          <span class="kui-list-item__description">
            {placeholder ? <Skeleton width={em(11)} /> : description}
          </span>
        )}
      </span>
      {(busy || status || trailing) && (
        <span class="kui-list-item__trailing">
          {/* The busy spinner is component-owned chrome drawn from a known
              prop, so a placeholder keeps it live. Status text and
              author-supplied trailing content are values: skeletons. */}
          {busy && <LoadingSpinner />}
          {status && (
            <span class="kui-list-item__status">
              {placeholder ? <Skeleton width={em(3.5)} /> : status}
            </span>
          )}
          {trailing && (placeholder ? <Skeleton width={em(1.5)} /> : trailing)}
        </span>
      )}
    </>
  );
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
  multilineIconAlign = 'first-line',
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
      data-icon-align={multiline ? multilineIconAlign : undefined}
      data-density={density}
      data-divider={divider}
      data-busy={busy ? 'true' : undefined}
      data-state={state}
      data-kui-disabled={disabled ? 'true' : undefined}
      data-placeholder={placeholder ? 'true' : undefined}
      aria-label={accessibleLabel}
      aria-current={selected ? 'page' : undefined}
      aria-pressed={pressed === undefined ? undefined : String(pressed)}
      aria-busy={placeholder || busy ? 'true' : undefined}
      slot={slot}
    >
      {listItemContent({
        label,
        description,
        icon,
        trailing,
        status,
        busy,
        multiline,
        placeholder,
      })}
    </button>
  );
}

/** A navigation row with native link activation and ListItem geometry. */
export function ListItemLink({
  href,
  external = false,
  label,
  description,
  icon,
  trailing,
  status,
  busy = false,
  density = 'standard',
  divider = 'none',
  selected = false,
  itemId,
  className = '',
  accessibleLabel,
  title,
  multiline = false,
  multilineIconAlign = 'first-line',
  state,
  disabled = false,
  tabIndex,
  placeholder = false,
  rootAttributes = {},
  slot,
}: ListItemLinkProps) {
  const extensionAttributes = filterDataAttributes(
    rootAttributes,
    PROTECTED_ROOT_DATA_ATTRIBUTES,
  );
  const inactive = disabled || placeholder;
  const linkLabel =
    accessibleLabel ??
    (external && typeof label === 'string'
      ? `${label} (opens in new tab)`
      : undefined);
  return (
    <a
      {...extensionAttributes}
      class={`kui-list-item ${className}`.trim()}
      href={inactive ? undefined : href}
      target={inactive || !external ? undefined : '_blank'}
      rel={inactive || !external ? undefined : 'noopener noreferrer'}
      title={placeholder ? undefined : title}
      tabindex={inactive ? -1 : tabIndex}
      data-component="list-item-link"
      data-item-id={itemId}
      data-has-icon={String(Boolean(icon))}
      data-has-description={String(Boolean(description))}
      data-multiline={multiline ? 'true' : undefined}
      data-icon-align={multiline ? multilineIconAlign : undefined}
      data-density={density}
      data-divider={divider}
      data-busy={busy ? 'true' : undefined}
      data-state={state}
      data-kui-disabled={disabled ? 'true' : undefined}
      data-placeholder={placeholder ? 'true' : undefined}
      aria-label={linkLabel}
      aria-current={selected ? 'page' : undefined}
      aria-disabled={inactive ? 'true' : undefined}
      aria-busy={placeholder || busy ? 'true' : undefined}
      slot={slot}
    >
      {listItemContent({
        label,
        description,
        icon,
        trailing,
        status,
        busy,
        multiline,
        placeholder,
      })}
    </a>
  );
}
