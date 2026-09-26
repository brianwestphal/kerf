import type { DividerSides } from './divider-sides.js';
import type { PaneSeparatorSide } from './pane.js';
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
  /**
   * Screen edges this toolbar claims for device safe-area compensation, for an
   * app bar or bottom bar that sits directly at a screen edge rather than in a
   * Pane header or footer. Each listed side pads by the inset its surrounding
   * layout reports through `--kui-edge-inset-*`, or the full device inset when
   * nothing routes that edge, while the toolbar's box and dividers paint
   * through. Omitted, the toolbar pads only the inline edges an owner such as
   * a Pane header hands it, and never a block edge.
   */
  safeAreaEdges?: readonly PaneSeparatorSide[];
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

const claim = (
  edges: readonly PaneSeparatorSide[] | undefined,
  side: PaneSeparatorSide,
) => (edges?.includes(side) ? 'true' : undefined);

export function Toolbar({
  leading,
  center,
  trailing,
  label,
  dividerSides = 'b',
  centerAlign = 'center',
  responsive = 'none',
  responsiveAt = 'narrow',
  safeAreaEdges,
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
      data-safe-area-block-start={claim(safeAreaEdges, 'block-start')}
      data-safe-area-block-end={claim(safeAreaEdges, 'block-end')}
      data-safe-area-inline-start={claim(safeAreaEdges, 'inline-start')}
      data-safe-area-inline-end={claim(safeAreaEdges, 'inline-end')}
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
