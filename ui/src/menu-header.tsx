import type { SafeHtml } from 'kerfjs';

import { filterControlAttributes, filterDataAttributes } from './extension-attributes.js';

const PROTECTED_ROOT_DATA_ATTRIBUTES = new Set([
  'data-component',
  'data-action',
  'data-has-badge',
  'data-has-count',
  'data-toggle',
]);
const PROTECTED_TRIGGER_DATA_ATTRIBUTES = new Set(['data-action']);

type MenuHeaderRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-action'?: never;
    'data-has-badge'?: never;
    'data-has-count'?: never;
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

interface MenuHeaderBaseProps {
  label: string;
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

type MenuHeaderIndicatorProps =
  | { count: number; countLabel: string; badge?: never }
  | { count?: never; countLabel?: never; badge?: SafeHtml };

export type MenuHeaderProps = MenuHeaderBaseProps & MenuHeaderIndicatorProps;

export function MenuHeader({ label, count, countLabel, badge, action, actionLabel, actionIcon, actionDisabled = false, disabledReason, expanded, toggle = false, rootAttributes = {}, triggerAttributes = {} }: MenuHeaderProps) {
  const extensionRootAttributes = filterDataAttributes(rootAttributes, PROTECTED_ROOT_DATA_ATTRIBUTES);
  const extensionTriggerAttributes = filterControlAttributes(triggerAttributes, PROTECTED_TRIGGER_DATA_ATTRIBUTES);
  const normalizedCount = typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : undefined;
  const normalizedCountLabel = normalizedCount === undefined
    ? undefined
    : typeof countLabel === 'string' && countLabel.trim() ? countLabel : String(normalizedCount);
  const renderedBadge = normalizedCount === undefined ? badge : undefined;
  const accessibleLabel = normalizedCount === undefined ? undefined : `${label}, ${normalizedCountLabel}`;
  const indicator = normalizedCount === undefined
    ? renderedBadge && <span class="kui-menu-header__badge">{renderedBadge}</span>
    : <span class="kui-menu-header__count" aria-hidden="true">{normalizedCount}</span>;
  if (toggle) {
    return <header {...extensionRootAttributes} class="kui-menu-header" data-component="menu-header" data-has-badge={String(Boolean(renderedBadge))} data-has-count={String(normalizedCount !== undefined)} data-toggle="true"><button {...extensionTriggerAttributes} type="button" class="kui-menu-header__title kui-menu-header__toggle" data-action={action} aria-label={accessibleLabel} aria-expanded={String(Boolean(expanded))}><span class="kui-menu-header__label">{label}</span>{indicator}{actionIcon && <span class="kui-menu-header__action-layer">{actionIcon}</span>}</button></header>;
  }
  return <header {...extensionRootAttributes} class="kui-menu-header" data-component="menu-header" data-has-badge={String(Boolean(renderedBadge))} data-has-count={String(normalizedCount !== undefined)} data-toggle="false"><div class="kui-menu-header__title"><h2 class="kui-menu-header__label" aria-label={accessibleLabel}>{label}</h2>{indicator}</div>{action && <button {...extensionTriggerAttributes} type="button" class="kui-menu-header__action" data-action={action} aria-label={actionLabel} title={actionDisabled ? disabledReason : actionLabel} disabled={actionDisabled || undefined}>{actionIcon}</button>}</header>;
}
