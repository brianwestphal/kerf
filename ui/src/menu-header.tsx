import type { SafeHtml } from 'kerfjs';

import { DisclosureArrow } from './disclosure-arrow.js';
import { filterControlAttributes, filterDataAttributes } from './extension-attributes.js';
import { Skeleton } from './skeleton.js';

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
  /** Render as an unanimated loading skeleton: keep the label and action affordance, disable interaction. */
  placeholder?: boolean;
  rootAttributes?: MenuHeaderRootAttributes;
  triggerAttributes?: MenuHeaderTriggerAttributes;
}

type MenuHeaderIndicatorProps =
  | { count: number; countLabel: string; badge?: never }
  | { count?: never; countLabel?: never; badge?: SafeHtml };

export type MenuHeaderProps = MenuHeaderBaseProps & MenuHeaderIndicatorProps;

export function MenuHeader({ label, count, countLabel, badge, action, actionLabel, actionIcon, actionDisabled = false, disabledReason, expanded, toggle = false, placeholder = false, rootAttributes = {}, triggerAttributes = {} }: MenuHeaderProps) {
  const extensionRootAttributes = filterDataAttributes(rootAttributes, PROTECTED_ROOT_DATA_ATTRIBUTES);
  const extensionTriggerAttributes = filterControlAttributes(triggerAttributes, PROTECTED_TRIGGER_DATA_ATTRIBUTES);
  const normalizedCount = typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : undefined;
  const normalizedCountLabel = normalizedCount === undefined
    ? undefined
    : typeof countLabel === 'string' && countLabel.trim() ? countLabel : String(normalizedCount);
  const renderedBadge = normalizedCount === undefined ? badge : undefined;
  const renderedActionIcon = actionIcon ?? (toggle ? <DisclosureArrow open={Boolean(expanded)} /> : undefined);
  const accessibleLabel = normalizedCount === undefined ? undefined : `${label}, ${normalizedCountLabel}`;
  const indicator = placeholder
    ? ((normalizedCount !== undefined || renderedBadge) && <span class="kui-menu-header__badge"><Skeleton width="1.75em" /></span>)
    : normalizedCount === undefined
      ? renderedBadge && <span class="kui-menu-header__badge">{renderedBadge}</span>
      : <span class="kui-menu-header__count" aria-hidden="true">{normalizedCount}</span>;
  const busy = placeholder ? ('true' as const) : undefined;
  if (toggle) {
    return <header {...extensionRootAttributes} class="kui-menu-header" data-component="menu-header" data-has-badge={String(Boolean(renderedBadge))} data-has-count={String(normalizedCount !== undefined)} data-toggle="true" data-placeholder={placeholder ? 'true' : undefined} aria-busy={busy}><button {...extensionTriggerAttributes} type="button" class="kui-menu-header__title kui-menu-header__toggle" data-action={placeholder ? undefined : action} disabled={placeholder || undefined} aria-label={accessibleLabel} aria-expanded={String(Boolean(expanded))}><span class="kui-menu-header__label">{label}</span>{indicator}{renderedActionIcon && <span class="kui-menu-header__action-layer">{renderedActionIcon}</span>}</button></header>;
  }
  return <header {...extensionRootAttributes} class="kui-menu-header" data-component="menu-header" data-has-badge={String(Boolean(renderedBadge))} data-has-count={String(normalizedCount !== undefined)} data-toggle="false" data-placeholder={placeholder ? 'true' : undefined} aria-busy={busy}><div class="kui-menu-header__title"><h2 class="kui-menu-header__label" aria-label={accessibleLabel}>{label}</h2>{indicator}</div>{action && <button {...extensionTriggerAttributes} type="button" class="kui-menu-header__action" data-action={placeholder ? undefined : action} aria-label={actionLabel} title={actionDisabled ? disabledReason : actionLabel} disabled={actionDisabled || placeholder || undefined}>{renderedActionIcon}</button>}</header>;
}
