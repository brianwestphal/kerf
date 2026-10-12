import type { SafeHtml } from 'kerfjs';

import {
  filterControlAttributes,
  filterDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import { em, remify } from '../../../shared/styles/css-values.js';
import { withWordBreaks } from '../../../shared/text/word-breaks.js';
import {
  PopupMenu,
  type PopupMenuEntry,
  type PopupMenuPlacement,
} from '../../actions/popup-menu/popup-menu.js';
import { LoadingSpinner } from '../../feedback/loading-spinner/loading-spinner.js';
import { Skeleton } from '../../feedback/skeleton/skeleton.js';

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
  'data-kui-disabled',
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
    'data-kui-disabled'?: never;
    popoverTarget?: string;
    popoverTargetAction?: 'toggle' | 'show' | 'hide';
    'aria-controls'?: string;
    'aria-haspopup'?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid' | 'true';
  }
>;

/** A trailing overflow `PopupMenu` rendered as the row's sibling trailing control. */
export interface ListActionRowTrailingMenu {
  /** Accessible name of the icon-only menu trigger, such as `Actions for report.json`. */
  label: string;
  /** Decorative trigger icon, typically a `MoreHorizontal` `LucideIcon`. */
  icon: SafeHtml;
  /** The menu's commands, headings, and dividers; items dispatch their own `data-action`s. */
  items: readonly PopupMenuEntry[];
  /** Where the menu opens relative to its trigger. Defaults to `bottom-end`. */
  placement?: PopupMenuPlacement;
  disabled?: boolean;
}

interface ListActionRowTrailingButtonProps {
  trailingAction: string;
  trailingActionLabel: string;
  /** Decorative dormant content for the trailing button. Must not contain interactive descendants. */
  trailingActionIcon: SafeHtml;
  trailingActionDisabled?: boolean;
  trailingActionTitle?: string;
  trailingActionAttributes?: ListActionRowTrailingAttributes;
  trailingMenu?: never;
}

interface ListActionRowTrailingMenuProps {
  /** A trailing overflow menu in place of the trailing button. Import `@kerfjs/ui/popup-menu/register` once. */
  trailingMenu: ListActionRowTrailingMenu;
  trailingAction?: never;
  trailingActionLabel?: never;
  trailingActionIcon?: never;
  trailingActionDisabled?: never;
  trailingActionTitle?: never;
  trailingActionAttributes?: never;
}

interface ListActionRowCommonProps {
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
  /** Render as an unanimated loading skeleton, disabling both actions: label, description, icon, and status text become skeletons; the `busy` indicator stays live. */
  placeholder?: boolean;
  trailingActionVisibility?: 'always' | 'interaction';
  className?: string;
  rootAttributes?: ListActionRowRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** Exactly one trailing control: a native button (`trailingAction*`) or an overflow menu (`trailingMenu`). */
export type ListActionRowProps = ListActionRowCommonProps &
  (ListActionRowTrailingButtonProps | ListActionRowTrailingMenuProps);

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
  trailingMenu,
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
        data-kui-disabled={disabled ? 'true' : undefined}
        data-action={placeholder ? undefined : action}
        data-item-id={itemId}
        aria-label={accessibleLabel}
        aria-current={selected ? 'page' : undefined}
        aria-pressed={pressed === undefined ? undefined : String(pressed)}
      >
        {icon && (
          <span class="kui-list-action-row__icon">
            {placeholder ? (
              <Skeleton block width={remify(18)} height={remify(18)} />
            ) : (
              icon
            )}
          </span>
        )}
        <span class="kui-list-action-row__label">
          <span class="kui-list-action-row__primary-label">
            {placeholder ? (
              <Skeleton width={em(9)} />
            ) : multiline ? (
              withWordBreaks(label)
            ) : (
              label
            )}
          </span>
          {description && (
            <span class="kui-list-action-row__description">
              {placeholder ? <Skeleton width={em(11)} /> : description}
            </span>
          )}
          {(busy || status) && (
            <span class="kui-list-action-row__status">
              {/* The busy spinner is component-owned chrome drawn from a
                  known prop, so a placeholder keeps it live; only the status
                  text is a value and becomes a skeleton. */}
              {busy && <LoadingSpinner />}
              {status && (placeholder ? <Skeleton width={em(6)} /> : status)}
            </span>
          )}
        </span>
      </button>
      {trailingMenu ? (
        <PopupMenu
          label={trailingMenu.label}
          icon={trailingMenu.icon}
          items={trailingMenu.items}
          placement={trailingMenu.placement ?? 'bottom-end'}
          caret={false}
          disabled={Boolean(trailingMenu.disabled) || placeholder}
        />
      ) : (
        <button
          {...extensionTrailingAttributes}
          type="button"
          class="kui-list-action-row__trailing-action"
          data-action={placeholder ? undefined : trailingAction}
          data-item-id={itemId}
          aria-label={trailingActionLabel}
          title={trailingActionTitle ?? trailingActionLabel}
          disabled={trailingActionDisabled || placeholder || undefined}
          data-kui-disabled={trailingActionDisabled ? 'true' : undefined}
        >
          {trailingActionIcon}
        </button>
      )}
    </div>
  );
}
