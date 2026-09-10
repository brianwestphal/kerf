import type { SafeHtml } from 'kerfjs';

export interface PageHeaderProps {
  title: string | SafeHtml;
  action?: SafeHtml;
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return <header class="kui-page-header" data-component="page-header"><h1>{title}</h1>{action && <div class="kui-page-header__action">{action}</div>}</header>;
}
