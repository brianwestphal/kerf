import type { SafeHtml } from 'kerfjs';

import { filterDataAttributes } from './extension-attributes.js';
import { Skeleton } from './skeleton.js';

const PROTECTED_ROOT_DATA_ATTRIBUTES = new Set([
  'data-component',
  'data-action',
  'data-item-id',
  'data-has-icon',
  'data-multiline',
  'data-state',
]);

type MenuItemRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-item-id'?: never;
    'data-has-icon'?: never;
    'data-multiline'?: never;
    'data-state'?: never;
  }
>;

export interface MenuItemProps {
  label: string | SafeHtml;
  icon?: SafeHtml;
  trailing?: SafeHtml;
  selected?: boolean;
  action: string;
  itemId?: string;
  className?: string;
  style?: string;
  pressed?: boolean;
  accessibleLabel?: string;
  title?: string;
  multiline?: boolean;
  state?: string;
  disabled?: boolean;
  tabIndex?: number;
  /** Render the row as an unanimated loading skeleton, disabling its action. */
  placeholder?: boolean;
  rootAttributes?: MenuItemRootAttributes;
}

export function MenuItem({ label, icon, trailing, selected = false, action, itemId, className = '', style, pressed, accessibleLabel, title, multiline = false, state, disabled = false, tabIndex, placeholder = false, rootAttributes = {} }: MenuItemProps) {
  const extensionAttributes = filterDataAttributes(rootAttributes, PROTECTED_ROOT_DATA_ATTRIBUTES);
  return <button {...extensionAttributes} type="button" class={`kui-menu-item ${className}`.trim()} style={style} title={placeholder ? undefined : title} disabled={disabled || placeholder} tabindex={placeholder ? -1 : tabIndex} data-component="menu-item" data-action={placeholder ? undefined : action} data-item-id={itemId} data-has-icon={String(Boolean(icon))} data-multiline={multiline ? 'true' : undefined} data-state={state} data-placeholder={placeholder ? 'true' : undefined} aria-label={accessibleLabel} aria-current={selected ? 'page' : undefined} aria-pressed={pressed === undefined ? undefined : String(pressed)} aria-busy={placeholder ? 'true' : undefined}>
    {icon && <span class="kui-menu-item__icon">{placeholder ? <Skeleton width="1em" height="1em" /> : icon}</span>}
    <span class="kui-menu-item__label">{placeholder ? <Skeleton width="9em" /> : label}</span>
    {trailing && <span class="kui-menu-item__trailing">{placeholder ? <Skeleton width="2.5em" /> : trailing}</span>}
  </button>;
}
