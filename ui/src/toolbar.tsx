import type { SafeHtml } from 'kerfjs';

export interface ToolbarProps {
  leading?: SafeHtml;
  center?: SafeHtml;
  trailing?: SafeHtml;
  label?: string;
  divider?: boolean;
  className?: string;
}

export function Toolbar({ leading, center, trailing, label, divider = true, className = '' }: ToolbarProps) {
  return <header class={`kui-toolbar ${className}`.trim()} data-component="toolbar" data-divider={String(divider)} data-has-center={String(Boolean(center))} aria-label={label}>
    <div class="kui-toolbar__leading">{leading}</div>
    <div class="kui-toolbar__center">{center}</div>
    <div class="kui-toolbar__trailing">{trailing}</div>
  </header>;
}
