import type { SafeHtml } from 'kerfjs';

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
}

export function MenuHeader({ label, badge, action, actionLabel, actionIcon, actionDisabled = false, disabledReason, expanded, toggle = false }: MenuHeaderProps) {
  if (toggle) {
    return <header class="kui-menu-header" data-component="menu-header" data-has-badge={String(Boolean(badge))} data-toggle="true"><button type="button" class="kui-menu-header__title kui-menu-header__toggle" data-action={action} aria-expanded={String(Boolean(expanded))}><span class="kui-menu-header__label">{label}</span>{badge && <span class="kui-menu-header__badge">{badge}</span>}{actionIcon && <span class="kui-menu-header__action-layer">{actionIcon}</span>}</button></header>;
  }
  return <header class="kui-menu-header" data-component="menu-header" data-has-badge={String(Boolean(badge))} data-toggle="false"><div class="kui-menu-header__title"><h2 class="kui-menu-header__label">{label}</h2>{badge && <span class="kui-menu-header__badge">{badge}</span>}</div>{action && <button type="button" class="kui-menu-header__action" data-action={action} aria-label={actionLabel} title={actionDisabled ? disabledReason : actionLabel} disabled={actionDisabled || undefined}>{actionIcon}</button>}</header>;
}
