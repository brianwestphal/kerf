import type { CssLength } from './css-values.js';
import type { KerfUiContent } from './semantic-content.js';

/** Where a {@link FloatingToolbar} floats within its positioned container. */
export type FloatingToolbarPosition =
  'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end';

export interface FloatingToolbarProps {
  /** Toolbar contents — normally one or more `ToolbarControlGroup`s. */
  children: KerfUiContent;
  /** Accessible name for the toolbar (required — it exposes `role="toolbar"`). */
  label: string;
  /**
   * Corner or edge it floats to inside its nearest positioned ancestor.
   * Default: `'bottom-end'`.
   */
  position?: FloatingToolbarPosition;
  /** Keep the toolbar in normal document flow instead of floating over content. */
  placement?: 'floating' | 'inline';
  /**
   * Distance from the container edges named by `position`. Default:
   * `space('m')` (16px, 8px past a top toolbar's own inset). Omit it inside a
   * `Workbench`, `CollapsiblePanel`, or `ResizableRegion` restore corner: the
   * corner owns the inset there and sets it to zero.
   */
  inset?: CssLength;
  /** Add device or layout-routed safe-area insets to the positioned edges. */
  safeAreaInsets?: boolean;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A toolbar that floats above the main content of its nearest positioned
 * ancestor — a transparent, forced-dark cluster of controls (e.g. a drawer
 * restore button) that sits over the content but NOT over dialogs or overlays
 * (it is not in the top layer). It is inset from the container edges by
 * `inset` (default `--kui-space-m`, i.e. 8px more than a top toolbar's own
 * inset); pass a typed length to move it. Inside a `Workbench`, `CollapsiblePanel`, or
 * `ResizableRegion` restore corner the corner owns the inset, so the toolbar
 * floats from the corner's own position. While one of those layouts has a
 * side overlay open over the toolbar's region (a Workbench rail overlay, a
 * `wireSidebar` compact overlay, an overlay `CollapsiblePanel` or horizontal
 * `ResizableRegion`), the toolbar is hidden — unfocusable and out of the
 * accessibility tree — until the overlay closes. The app owns the controls
 * and their behavior — wire them with `delegate()` as usual. Set
 * `placement="inline"` for normal flow when an owner already positions the
 * control; floating placement can add safe-area insets to its per-edge tokens.
 */
export function FloatingToolbar({
  children,
  label,
  position = 'bottom-end',
  placement = 'floating',
  inset,
  safeAreaInsets = false,
  className = '',
  slot,
}: FloatingToolbarProps) {
  return (
    <div
      class={`kui-floating-toolbar ${className}`.trim()}
      data-component="floating-toolbar"
      data-position={position}
      data-placement={placement}
      data-safe-area-insets={safeAreaInsets ? 'true' : undefined}
      role="toolbar"
      aria-label={label}
      style={inset ? `--kui-floating-toolbar-inset:${inset}` : undefined}
      slot={slot}
    >
      {children}
    </div>
  );
}
