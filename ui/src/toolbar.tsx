import type { DividerSides } from './divider-sides.js';
import type { KerfUiContent } from './semantic-content.js';

export interface ToolbarProps {
  leading?: KerfUiContent;
  center?: KerfUiContent;
  trailing?: KerfUiContent;
  label?: string;
  /** Physical divider edges in canonical top/right/bottom/left order. Defaults to bottom. */
  dividerSides?: DividerSides;
  /** Horizontal treatment of the center zone. Defaults to centered content. */
  centerAlign?: 'center' | 'stretch';
  /**
   * Component-owned responsive layout; applications choose the policy rather
   * than restyling toolbar internals. Under every policy the trailing zone
   * wraps its groups instead of clipping an action.
   * - `none` keeps one row; the leading identity truncates first.
   * - `stack` stacks the zones at `responsiveAt`, wrapping stacked control
   *   groups onto further rows.
   * - `wrap` keeps one row while every zone fits at its natural width, and
   *   otherwise moves the trailing zone below a whole leading identity.
   * - `center-priority` gives an expanded center control the full row.
   */
  responsive?: 'none' | 'stack' | 'wrap' | 'center-priority';
  /** Container width at which `responsive="stack"` activates. */
  responsiveAt?: 'compact' | 'narrow';
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export function Toolbar({
  leading,
  center,
  trailing,
  label,
  dividerSides = 'b',
  centerAlign = 'center',
  responsive = 'none',
  responsiveAt = 'narrow',
  className = '',
  slot,
}: ToolbarProps) {
  return (
    <header
      class={`kui-toolbar ${className}`.trim()}
      data-component="toolbar"
      divider-sides={dividerSides || undefined}
      data-has-center={String(Boolean(center))}
      data-center-align={centerAlign}
      data-responsive={responsive}
      data-responsive-at={responsiveAt}
      aria-label={label}
      slot={slot}
    >
      <div class="kui-toolbar__leading">{leading}</div>
      <div class="kui-toolbar__center">{center}</div>
      <div class="kui-toolbar__trailing">{trailing}</div>
    </header>
  );
}

export type { DividerSides } from './divider-sides.js';
