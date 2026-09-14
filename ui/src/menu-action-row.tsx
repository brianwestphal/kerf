import type { SafeHtml } from 'kerfjs';

import { filterControlAttributes, filterDataAttributes } from './extension-attributes.js';

const PROTECTED_ROOT_DATA_ATTRIBUTES = new Set([
  'data-component',
  'data-action',
  'data-item-id',
  'data-has-icon',
  'data-multiline',
  'data-state',
  'data-selected',
  'data-pressed',
]);
const PROTECTED_TRAILING_DATA_ATTRIBUTES = new Set([
  'data-component',
  'data-action',
  'data-item-id',
]);

type MenuActionRowRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-has-icon'?: never;
    'data-multiline'?: never;
    'data-state'?: never;
    'data-selected'?: never;
    'data-pressed'?: never;
  }
>;

type MenuActionRowTrailingAttributes = Readonly<
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

export interface MenuActionRowProps {
  /** Visible dormant content for the primary button. Must not contain interactive descendants. */
  label: string | SafeHtml;
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
  trailingAction: string;
  trailingActionLabel: string;
  /** Decorative dormant content for the trailing button. Must not contain interactive descendants. */
  trailingActionIcon: SafeHtml;
  trailingActionDisabled?: boolean;
  trailingActionTitle?: string;
  className?: string;
  style?: string;
  rootAttributes?: MenuActionRowRootAttributes;
  trailingActionAttributes?: MenuActionRowTrailingAttributes;
}

export function MenuActionRow({ label, icon, action, itemId, selected = false, pressed, accessibleLabel, title, multiline = false, state, disabled = false, tabIndex, trailingAction, trailingActionLabel, trailingActionIcon, trailingActionDisabled = false, trailingActionTitle, className = '', style, rootAttributes = {}, trailingActionAttributes = {} }: MenuActionRowProps) {
  const extensionRootAttributes = filterDataAttributes(rootAttributes, PROTECTED_ROOT_DATA_ATTRIBUTES);
  const extensionTrailingAttributes = filterControlAttributes(trailingActionAttributes, PROTECTED_TRAILING_DATA_ATTRIBUTES);

  return <div {...extensionRootAttributes} class={`kui-menu-action-row ${className}`.trim()} style={style} data-component="menu-action-row" data-item-id={itemId} data-has-icon={String(Boolean(icon))} data-multiline={multiline ? 'true' : undefined} data-state={state} data-selected={String(selected)} data-pressed={pressed === undefined ? undefined : String(pressed)}>
    <button type="button" class="kui-menu-action-row__primary" title={title} disabled={disabled} tabindex={tabIndex} data-action={action} data-item-id={itemId} aria-label={accessibleLabel} aria-current={selected ? 'page' : undefined} aria-pressed={pressed === undefined ? undefined : String(pressed)}>
      {icon && <span class="kui-menu-action-row__icon">{icon}</span>}
      <span class="kui-menu-action-row__label">{label}</span>
    </button>
    <button {...extensionTrailingAttributes} type="button" class="kui-menu-action-row__trailing-action" data-action={trailingAction} data-item-id={itemId} aria-label={trailingActionLabel} title={trailingActionTitle ?? trailingActionLabel} disabled={trailingActionDisabled || undefined}>{trailingActionIcon}</button>
  </div>;
}
