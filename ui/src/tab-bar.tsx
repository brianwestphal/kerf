import type { SafeHtml } from 'kerfjs';

export interface TabBarProps {
  id: string;
  label: string;
  children: SafeHtml | readonly SafeHtml[];
  leading?: SafeHtml;
  trailing?: SafeHtml;
  className?: string;
}

/** Render a controlled tab strip. The application owns selection, order, and persistence. */
export function TabBar({ id, label, children, leading, trailing, className = '' }: TabBarProps) {
  return <nav class={`kui-tab-bar ${className}`.trim()} data-component="tab-bar" data-tab-bar-id={id} aria-label={label}>
    {leading && <div class="kui-tab-bar__leading">{leading}</div>}
    <div class="kui-tab-bar__tabs" role="tablist" aria-label={label} data-kui-tab-list>{children}</div>
    {trailing && <div class="kui-tab-bar__trailing">{trailing}</div>}
  </nav>;
}
