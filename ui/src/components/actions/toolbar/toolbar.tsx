import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import type { Sides } from '../../../shared/layout/sides.js';
import type { PaneSeparatorSide } from '../../layout/pane/pane.js';

export type ToolbarPosition = 'header' | 'footer';
/** Control-band density: `default` (60px with 44px groups) or `compact`. */
export type ToolbarDensity = 'default' | 'compact';

export interface ToolbarProps {
  /**
   * The toolbar's id, so app code can address it: name it as a scrolling
   * List's chrome in `wireScrollDividers({ targets })`, or find it in tests.
   */
  id?: string;
  leading?: KerfUiContent;
  center?: KerfUiContent;
  trailing?: KerfUiContent;
  label?: string;
  /** Use footer semantics for a bottom toolbar; defaults to header. */
  position?: ToolbarPosition;
  /**
   * `compact` sizes the toolbar to a 34px control band with 3px block
   * insets — 40px tall — for a header embedded in a panel or card. Fill it
   * with `ToolbarControlGroup size="compact"` groups; inline insets and the
   * gap between zones are unchanged. Composites that render a Toolbar from a
   * `ToolbarConfig` (Workbench, CollapsiblePanel, NavStack, SplitView) forward
   * it and size the groups they compose to match. Defaults to `default`.
   */
  density?: ToolbarDensity;
  /**
   * Physical divider edges in canonical top/right/bottom/left order, drawn
   * always. Defaults to none: a toolbar pinned over or under scrolling content
   * gets its divider from the scroll state instead — a `Pane` draws the line
   * between its chrome and content while content is scrolled away beneath it,
   * and `wireScrollDividers` `targets` can name a toolbar as chrome, which
   * then draws its facing side the same way.
   */
  dividerSides?: Sides;
  /** `balanced` gives both side zones equal tracks, centering the middle zone on the toolbar even if only one side has controls. */
  centerAlign?: 'center' | 'stretch' | 'balanced';
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
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

/**
 * A toolbar's configuration, apart from its content: the props a composite
 * that renders a `Toolbar` for the app (a Workbench or CollapsiblePanel
 * toolbar) forwards, so the app configures that toolbar instead of styling it.
 */
export type ToolbarConfig = Pick<
  ToolbarProps,
  | 'density'
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

const TOOLBAR_PROTECTED = new Set([
  'data-center-align',
  'data-component',
  'data-density',
  'data-has-center',
  'data-responsive',
  'data-responsive-at',
  'data-safe-area-block-end',
  'data-safe-area-block-start',
  'data-safe-area-inline-end',
  'data-safe-area-inline-start',
]);

export function Toolbar({
  id,
  leading,
  center,
  trailing,
  label,
  position = 'header',
  density = 'default',
  dividerSides = '',
  centerAlign = 'center',
  responsive = 'none',
  responsiveAt = 'narrow',
  safeAreaEdges,
  className = '',
  slot,
  rootAttributes = {},
}: ToolbarProps) {
  const attributes = {
    ...filterDataAttributes(rootAttributes, TOOLBAR_PROTECTED),
    id,
    class: `kui-toolbar ${className}`.trim(),
    'data-component': 'toolbar',
    'data-density': density === 'compact' ? 'compact' : undefined,
    'divider-sides': dividerSides || undefined,
    'data-has-center': String(Boolean(center)),
    'data-center-align': centerAlign,
    'data-responsive': responsive,
    'data-responsive-at': responsiveAt,
    'data-safe-area-block-start': claim(safeAreaEdges, 'block-start'),
    'data-safe-area-block-end': claim(safeAreaEdges, 'block-end'),
    'data-safe-area-inline-start': claim(safeAreaEdges, 'inline-start'),
    'data-safe-area-inline-end': claim(safeAreaEdges, 'inline-end'),
    'aria-label': label,
    slot,
  };
  const zones = (
    <>
      <div class="kui-toolbar__leading">{leading}</div>
      <div class="kui-toolbar__center">{center}</div>
      <div class="kui-toolbar__trailing">{trailing}</div>
    </>
  );
  return position === 'footer' ? (
    <footer {...attributes}>{zones}</footer>
  ) : (
    <header {...attributes}>{zones}</header>
  );
}

export type { Sides } from '../../../shared/layout/sides.js';
