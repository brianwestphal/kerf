import type { SafeHtml } from 'kerfjs';

import { LucideIcon } from './lucide-icon.js';
import { Pane } from './pane.js';
import {
  collapsiblePanelToggleIcon,
  composedPanelToolbar,
  type PanelSide,
  type PanelToggle,
  type PanelToggleAttributes,
  type PanelToolbar,
  relocatedPanelGroups,
} from './panel-toolbar.js';
import type {
  ResizableRegionCollapseMotion,
  ResizableRegionContentOverflow,
  ResizableRegionPresentation,
  ResizableRegionRestorePosition,
  ResizableRegionSeparator,
} from './resizable-region.js';
import type { KerfUiContent } from './semantic-content.js';

export { collapsiblePanelToggleIcon } from './panel-toolbar.js';

/** Which edge a {@link CollapsiblePanel} docks to. */
export type CollapsiblePanelSide = PanelSide;

/** The standard toggle a panel toolbar renders (see {@link CollapsiblePanelToolbar}). */
export type CollapsiblePanelToolbarToggle = PanelToggle;

/**
 * A panel's composed top toolbar. `title` and `panelOnly` groups lead it and
 * are available only while the panel is open; `constant` groups and the
 * standard `toggle` trail it while open and move to the app's work-area
 * toolbar — through {@link CollapsiblePanelRelocated} — while it is collapsed.
 */
export type CollapsiblePanelToolbar = PanelToolbar;

/** A CollapsiblePanel toggle's `wireSidebar` hook. */
const toggleAttributes = (panelId: string): PanelToggleAttributes => ({
  'data-collapsible-target': panelId,
  // Keyed, so the morph never reuses a (possibly focused) toggle's button for
  // another control as the toggle moves between toolbars.
  'data-key': `${panelId}-toggle`,
});

export interface CollapsiblePanelToggleProps {
  /** The panel this toggle controls. */
  side: CollapsiblePanelSide;
  /** The panel's current collapsed state (drives the icon direction). */
  collapsed: boolean;
  /** `data-action` the button carries so `wireSidebar` can delegate its click. */
  action: string;
  /** The panel id the button targets (`data-tab-panel`-style: `data-collapsible-panel`). */
  panelId?: string;
  /** Accessible label; defaults to "Collapse"/"Expand". */
  label?: string;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A standard collapse/expand toggle button for a {@link CollapsiblePanel}: the
 * recognizable per-side icon (see {@link collapsiblePanelToggleIcon}) plus the
 * `data-action` / `aria-expanded` `wireSidebar` reads. Placement is the app's —
 * put it in the panel's own header (to collapse) and somewhere always-visible
 * (to expand while collapsed).
 */
export function CollapsiblePanelToggle({
  side,
  collapsed,
  action,
  panelId,
  label,
  className = '',
  slot,
}: CollapsiblePanelToggleProps) {
  const glyph = collapsiblePanelToggleIcon(side, collapsed);
  const accessible = label ?? (collapsed ? 'Expand' : 'Collapse');
  return (
    <button
      type="button"
      class={`kui-collapsible-panel__toggle ${className}`.trim()}
      data-action={action}
      data-collapsible-target={panelId}
      aria-expanded={String(!collapsed)}
      aria-label={accessible}
      slot={slot}
    >
      <LucideIcon icon={glyph.icon} name={glyph.name} />
    </button>
  );
}

export interface CollapsiblePanelProps {
  /** A stable id for the panel — `wireSidebar` targets it and toggles reference it. */
  id: string;
  /** Which edge the panel docks to: a left/right rail or a bottom drawer. */
  side: CollapsiblePanelSide;
  /** Whether the panel is currently collapsed (the app owns this signal). */
  collapsed?: boolean;
  /** Rail width or drawer height in px. Overrides the CSS default. */
  size?: number;
  /** Accessible label for the panel region. */
  label?: string;
  /** Panel content. */
  children?: KerfUiContent;
  /**
   * The panel's top toolbar, composed so its groups follow the panel's open
   * state. With it, `children` renders in a `Pane` below the toolbar; render
   * {@link CollapsiblePanelRelocated} in the app's work-area toolbar so the
   * `constant` groups and toggle stay reachable while the panel is collapsed.
   */
  toolbar?: CollapsiblePanelToolbar;
  /** Optional bottom toolbar under a `toolbar` panel's content. */
  footer?: KerfUiContent;
  separator?: ResizableRegionSeparator;
  collapseMotion?: ResizableRegionCollapseMotion;
  contentOverflow?: ResizableRegionContentOverflow;
  presentation?: ResizableRegionPresentation;
  /** Control shown while collapsed, in a safe-area-aware corner of the panel's container (not the viewport). */
  restoreControl?: SafeHtml;
  restorePosition?: ResizableRegionRestorePosition;
  className?: string;
}

/**
 * A standalone collapsible side rail or bottom drawer, outside the full
 * {@link Workbench} shell. It owns only the presentation: a fixed-size content
 * area that stays laid out while the panel's track snaps to zero and the content
 * slides out via `transform` (one reflow, composited — the same technique
 * `Workbench` and the catalog sidebar use). Bottom-drawer content stays anchored
 * to the panel's fixed bottom edge, so the track cannot move its layout origin
 * underneath the transform transition. A collapsed panel renders `inert` (with
 * `aria-hidden`), so neither Tab, pointer, nor assistive technology reaches
 * content that has slid out of view; its `restoreControl` renders outside the
 * panel and stays reachable.
 * The app owns the `collapsed` signal;
 * pair it with `wireSidebar` for the toggle, focus, compact-overlay, keyboard,
 * and persistence semantics, and with `CollapsiblePanelToggle` for the standard
 * affordance. See `ui/docs/collapsible-panel.md` and `docs/23-app-layouts.md`.
 */
export function CollapsiblePanel({
  id,
  side,
  collapsed = false,
  size,
  label,
  children,
  toolbar,
  footer,
  separator = 'auto',
  collapseMotion = 'slide',
  contentOverflow = 'clip',
  presentation = 'inline',
  restoreControl,
  restorePosition = side === 'left' ? 'bottom-start' : 'bottom-end',
  className = '',
}: CollapsiblePanelProps) {
  const sizeVar =
    side === 'bottom'
      ? '--kui-collapsible-panel-height'
      : '--kui-collapsible-panel-width';
  return (
    <>
      <aside
        class={`kui-collapsible-panel kui-collapsible-panel--${side} ${className}`.trim()}
        data-component="collapsible-panel"
        data-collapsible-panel={id}
        data-side={side}
        data-collapsed={String(collapsed)}
        data-separator={separator}
        data-collapse-motion={collapseMotion}
        data-content-overflow={contentOverflow}
        data-presentation={presentation}
        aria-label={label || undefined}
        aria-hidden={
          collapsed || presentation === 'hidden' ? 'true' : undefined
        }
        inert={collapsed}
        style={size ? `${sizeVar}: ${size}px` : undefined}
      >
        <div class="kui-collapsible-panel__content">
          {toolbar ? (
            <Pane
              header={composedPanelToolbar(
                toolbar,
                side,
                collapsed,
                toggleAttributes(id),
              )}
              footer={footer}
            >
              {children}
            </Pane>
          ) : (
            children
          )}
        </div>
      </aside>
      {collapsed && restoreControl && presentation !== 'hidden' && (
        <div
          class="kui-collapsible-panel__restore"
          data-panel-restore={id}
          data-position={restorePosition}
        >
          {restoreControl}
        </div>
      )}
    </>
  );
}

export interface CollapsiblePanelRelocatedProps {
  /** The panel's `id`. */
  panelId: string;
  side: CollapsiblePanelSide;
  /** The panel's current collapsed state. */
  collapsed: boolean;
  /** The same `toolbar` the panel receives. */
  toolbar: CollapsiblePanelToolbar;
}

/**
 * A collapsed {@link CollapsiblePanel}'s `constant` groups and standard
 * toggle, for the app's work-area toolbar — nothing while the panel is open.
 * Put it first in the leading zone for a left rail, last in the trailing zone
 * for a right rail, and last in a bottom toolbar (or a `FloatingToolbar`
 * `restoreControl`) for a bottom drawer. `wireSidebar` hands focus to it when
 * the panel closes from its own toggle.
 */
export function CollapsiblePanelRelocated({
  panelId,
  side,
  collapsed,
  toolbar,
}: CollapsiblePanelRelocatedProps) {
  return (
    <>
      {relocatedPanelGroups(
        toolbar,
        side,
        collapsed,
        toggleAttributes(panelId),
      )}
    </>
  );
}
