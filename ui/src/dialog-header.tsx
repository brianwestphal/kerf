import type { SafeHtml } from 'kerfjs';

export interface DialogHeaderProps {
  title: string;
  titleId: string;
  summary: string;
  summaryId?: string;
  icon?: SafeHtml;
  iconClassName?: string;
  actions?: SafeHtml;
}

export function DialogHeader({ title, titleId, summary, summaryId, icon, iconClassName = '', actions }: DialogHeaderProps) {
  return <header class="kui-dialog-header" data-component="dialog-header" data-has-icon={String(Boolean(icon))}>
    {icon && <span class={`kui-dialog-header__icon ${iconClassName}`.trim()}>{icon}</span>}
    <div class="kui-dialog-header__copy"><h2 id={titleId}>{title}</h2><p id={summaryId}>{summary}</p></div>
    {actions && <div class="kui-dialog-header__actions">{actions}</div>}
  </header>;
}
