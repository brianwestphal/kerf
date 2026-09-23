import type { SafeHtml } from 'kerfjs';
import {
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide';

import { LucideIcon } from './lucide-icon.js';
import type {
  ResizableRegionCollapseMotion,
  ResizableRegionContentOverflow,
  ResizableRegionPresentation,
  ResizableRegionRestorePosition,
  ResizableRegionSeparator,
} from './resizable-region.js';

/** Which edge a {@link CollapsiblePanel} docks to. */
export type CollapsiblePanelSide = 'left' | 'right' | 'bottom';

/**
 * The standard collapse/expand icon for a panel `side` and `collapsed` state,
 * so every app's sidebars and drawers use one recognizable convention:
 * `PanelLeft*` for a left rail, `PanelRight*` for a right rail, `PanelBottom*`
 * for a bottom drawer — the `Close` glyph while open, the `Open` glyph while
 * collapsed. Exposed so an app can render its own toggle affordance.
 */
export function collapsiblePanelToggleIcon(
  side: CollapsiblePanelSide,
  collapsed: boolean,
): { icon: Parameters<typeof LucideIcon>[0]['icon']; name: string } {
  if (side === 'left')
    return collapsed
      ? { icon: PanelLeftOpen, name: 'panel-left-open' }
      : { icon: PanelLeftClose, name: 'panel-left-close' };
  if (side === 'right')
    return collapsed
      ? { icon: PanelRightOpen, name: 'panel-right-open' }
      : { icon: PanelRightClose, name: 'panel-right-close' };
  return collapsed
    ? { icon: PanelBottomOpen, name: 'panel-bottom-open' }
    : { icon: PanelBottomClose, name: 'panel-bottom-close' };
}

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
  children?: SafeHtml | readonly SafeHtml[];
  separator?: ResizableRegionSeparator;
  collapseMotion?: ResizableRegionCollapseMotion;
  contentOverflow?: ResizableRegionContentOverflow;
  presentation?: ResizableRegionPresentation;
  /** Control shown in a safe-area-aware viewport corner while collapsed. */
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
 * underneath the transform transition. The app owns the `collapsed` signal;
 * pair it with `wireSidebar` for the toggle, focus, compact-overlay, keyboard,
 * and persistence semantics, and with `CollapsiblePanelToggle` for the standard
 * affordance. See `docs/24-collapsible-panel.md`.
 */
export function CollapsiblePanel({
  id,
  side,
  collapsed = false,
  size,
  label,
  children,
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
        style={size ? `${sizeVar}: ${size}px` : undefined}
      >
        <div class="kui-collapsible-panel__content">{children}</div>
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
