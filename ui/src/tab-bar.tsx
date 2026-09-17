import type { SafeHtml } from 'kerfjs';

export interface TabBarProps {
  id: string;
  label: string;
  children: SafeHtml | readonly SafeHtml[];
  leading?: SafeHtml;
  trailing?: SafeHtml;
  className?: string;
  /**
   * Keyboard activation mode for this strip, emitted as `data-tab-activation` for
   * `wireTabBars` to read (overrides its `activation` option). `'automatic'` (default)
   * selects on arrow / Home / End; `'manual'` moves roving focus only and the user
   * selects with Enter / Space / click — use it when selecting a tab is a heavy action.
   */
  activation?: 'automatic' | 'manual';
}

/** Render a controlled tab strip. The application owns selection, order, and persistence. */
export function TabBar({ id, label, children, leading, trailing, className = '', activation }: TabBarProps) {
  return <nav class={`kui-tab-bar ${className}`.trim()} data-component="tab-bar" data-tab-bar-id={id} data-tab-activation={activation} aria-label={label}>
    {leading && <div class="kui-tab-bar__leading">{leading}</div>}
    <div class="kui-tab-bar__tabs" role="tablist" aria-label={label} data-kui-tab-list>{children}</div>
    {trailing && <div class="kui-tab-bar__trailing">{trailing}</div>}
  </nav>;
}
