import type { SafeHtml } from 'kerfjs';

export interface MenuHeaderProps {
  label: string;
  action?: string;
  actionLabel?: string;
  actionIcon?: SafeHtml;
  actionDisabled?: boolean;
  disabledReason?: string;
  expanded?: boolean;
  toggle?: boolean;
}

export function MenuHeader({ label, action, actionLabel, actionIcon, actionDisabled = false, disabledReason, expanded, toggle = false }: MenuHeaderProps) {
  if (toggle) {
    return <button type="button" class="kui-menu-header kui-menu-header--toggle" data-component="menu-header" data-action={action} aria-expanded={String(Boolean(expanded))}><span>{label}</span>{actionIcon}</button>;
  }
  return <header class="kui-menu-header" data-component="menu-header"><h2>{label}</h2>{action && <button type="button" data-action={action} aria-label={actionLabel} title={actionDisabled ? disabledReason : actionLabel} disabled={actionDisabled || undefined}>{actionIcon}</button>}</header>;
}
