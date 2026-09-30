import type { PaneSeparatorSide } from './pane.js';
import type { KerfUiContent } from './semantic-content.js';
import type { Sides } from './sides.js';

export interface ToolbarProps {
  leading?: KerfUiContent;
  center?: KerfUiContent;
  trailing?: KerfUiContent;
  label?: string;
  /**
   * Physical divider edges in canonical top/right/bottom/left order, drawn
   * always. Defaults to none: a toolbar pinned over or under scrolling content
   * gets its divider from the scroll state instead — a `Pane` draws the line
   * between its chrome and content while content is scrolled away beneath it,
   * and `wireScrollDividers` `targets` can name a toolbar as chrome, which
   * then draws its facing side the same way.
   */
  dividerSides?: Sides;
  /** Horizontal treatment of the center zone. Defaults to centered content. */
  centerAlign?: 'center' | 'stretch';
  /**
   * Component-owned responsive layout; applications choose the policy rather
   * than restyling toolbar internals. Under every policy the trailing zone
   * wraps its groups instead of clipping an action, and the center zone keeps
   * its whole content width: when the zones do not fit one row, the leading
   * title truncates with an ellipsis rather than the center overlapping it.
   * - `none` keeps one row; the leading identity truncates first.
   * - `stack` stacks the zones at `responsiveAt`, wrapping stacked control
   *   groups onto further rows.
   * - `wrap` keeps one row while every zone fits at its natural width, and
   *   otherwise moves the trailing zone below a whole leading identity.
   * - `center-priority` gives an expanded center control the full row.
   * - `trailing-priority` moves an expanded trailing control to a full row
   *   below the leading identity at `responsiveAt`.
   */
  responsive?:
    'none' | 'stack' | 'wrap' | 'center-priority' | 'trailing-priority';
  /** Container width at which `stack` or `trailing-priority` activates. */
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

/**
 * A toolbar's configuration, apart from its content: the props a composite
 * that renders a `Toolbar` for the app (a Workbench or CollapsiblePanel
 * toolbar) forwards, so the app configures that toolbar instead of styling it.
 */
export type ToolbarConfig = Pick<
  ToolbarProps,
  | 'dividerSides'
  | 'centerAlign'
  | 'responsive'
  | 'responsiveAt'
  | 'safeAreaEdges'
>;

const claim = (
  edges: readonly PaneSeparatorSide[] | undefined,
  side: PaneSeparatorSide,
) => (edges?.includes(side) ? 'true' : undefined);

export function Toolbar({
  leading,
  center,
  trailing,
  label,
  dividerSides = '',
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

export type { Sides } from './sides.js';
