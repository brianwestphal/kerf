import type { SafeHtml } from 'kerfjs';

export type StateBannerTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface StateBannerProps {
  title: string;
  detail?: string;
  icon?: SafeHtml;
  action?: SafeHtml;
  tone?: StateBannerTone;
  urgency?: 'status' | 'alert';
  className?: string;
}

export function StateBanner({ title, detail, icon, action, tone = 'info', urgency = 'status', className = '' }: StateBannerProps) {
  return <section class={`kui-state-banner ${className}`.trim()} data-component="state-banner" data-tone={tone} role={urgency} aria-live={urgency === 'alert' ? 'assertive' : 'polite'}>
    {icon && <span class="kui-state-banner__icon">{icon}</span>}
    <div class="kui-state-banner__copy"><strong>{title}</strong>{detail && <span>{detail}</span>}</div>
    {action && <div class="kui-state-banner__action">{action}</div>}
  </section>;
}
