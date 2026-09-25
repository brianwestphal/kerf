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
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A toolbar that floats above the main content of its nearest positioned
 * ancestor — a transparent, forced-dark cluster of controls (e.g. a drawer
 * restore button) that sits over the content but NOT over dialogs or overlays
 * (it is not in the top layer). It is inset from the container edges by
 * `--kui-floating-toolbar-inset` (default `--kui-space-m`, i.e. 8px more than a
 * top toolbar's own inset); override that token to move it. The app owns the
 * controls and their behavior — wire them with `delegate()` as usual.
 */
export function FloatingToolbar({
  children,
  label,
  position = 'bottom-end',
  className = '',
  slot,
}: FloatingToolbarProps) {
  return (
    <div
      class={`kui-floating-toolbar ${className}`.trim()}
      data-component="floating-toolbar"
      data-position={position}
      role="toolbar"
      aria-label={label}
      slot={slot}
    >
      {children}
    </div>
  );
}
