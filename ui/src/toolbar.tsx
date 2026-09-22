import type { SafeHtml } from 'kerfjs';

import type { DividerSides } from './divider-sides.js';

export interface ToolbarProps {
  leading?: SafeHtml;
  center?: SafeHtml;
  trailing?: SafeHtml;
  label?: string;
  /** Physical divider edges in canonical top/right/bottom/left order. Defaults to bottom. */
  dividerSides?: DividerSides;
  className?: string;
}

export function Toolbar({
  leading,
  center,
  trailing,
  label,
  dividerSides = 'b',
  className = '',
}: ToolbarProps) {
  return (
    <header
      class={`kui-toolbar ${className}`.trim()}
      data-component="toolbar"
      divider-sides={dividerSides || undefined}
      data-has-center={String(Boolean(center))}
      aria-label={label}
    >
      <div class="kui-toolbar__leading">{leading}</div>
      <div class="kui-toolbar__center">{center}</div>
      <div class="kui-toolbar__trailing">{trailing}</div>
    </header>
  );
}

export type { DividerSides } from './divider-sides.js';
