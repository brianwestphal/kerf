import type { SafeHtml } from 'kerfjs';

import { filterControlAttributes, filterDataAttributes } from './extension-attributes.js';

const PROTECTED_ROOT_DATA_ATTRIBUTES = new Set([
  'data-component',
  'data-action',
  'data-has-badge',
  'data-toggle',
]);
const PROTECTED_TRIGGER_DATA_ATTRIBUTES = new Set(['data-action']);

type MenuHeaderRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-has-badge'?: never;
    'data-toggle'?: never;
  }
>;

type MenuHeaderTriggerAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-action'?: never;
    popoverTarget?: string;
    popoverTargetAction?: 'toggle' | 'show' | 'hide';
    'aria-controls'?: string;
    'aria-haspopup'?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid' | 'true';
  }
>;

export interface MenuHeaderProps {
  label: string;
  badge?: SafeHtml;
  action?: string;
  actionLabel?: string;
  actionIcon?: SafeHtml;
  actionDisabled?: boolean;
  disabledReason?: string;
  expanded?: boolean;
  toggle?: boolean;
  rootAttributes?: MenuHeaderRootAttributes;
  triggerAttributes?: MenuHeaderTriggerAttributes;
}

export function MenuHeader({ label, badge, action, actionLabel, actionIcon, actionDisabled = false, disabledReason, expanded, toggle = false, rootAttributes = {}, triggerAttributes = {} }: MenuHeaderProps) {
  const extensionRootAttributes = filterDataAttributes(rootAttributes, PROTECTED_ROOT_DATA_ATTRIBUTES);
  const extensionTriggerAttributes = filterControlAttributes(triggerAttributes, PROTECTED_TRIGGER_DATA_ATTRIBUTES);
  if (toggle) {
    return <header {...extensionRootAttributes} class="kui-menu-header" data-component="menu-header" data-has-badge={String(Boolean(badge))} data-toggle="true"><button {...extensionTriggerAttributes} type="button" class="kui-menu-header__title kui-menu-header__toggle" data-action={action} aria-expanded={String(Boolean(expanded))}><span class="kui-menu-header__label">{label}</span>{badge && <span class="kui-menu-header__badge">{badge}</span>}{actionIcon && <span class="kui-menu-header__action-layer">{actionIcon}</span>}</button></header>;
  }
  return <header {...extensionRootAttributes} class="kui-menu-header" data-component="menu-header" data-has-badge={String(Boolean(badge))} data-toggle="false"><div class="kui-menu-header__title"><h2 class="kui-menu-header__label">{label}</h2>{badge && <span class="kui-menu-header__badge">{badge}</span>}</div>{action && <button {...extensionTriggerAttributes} type="button" class="kui-menu-header__action" data-action={action} aria-label={actionLabel} title={actionDisabled ? disabledReason : actionLabel} disabled={actionDisabled || undefined}>{actionIcon}</button>}</header>;
}
