import type { SafeHtml } from 'kerfjs';

import {
  clampRegionSize,
  type ResizableRegionAxis,
  type ResizableRegionCollapseMotion,
  type ResizableRegionContentOverflow,
  type ResizableRegionEdge,
  type ResizableRegionPresentation,
  type ResizableRegionRestorePosition,
  type ResizableRegionSeparator,
} from './resizable-region.js';
import { ResizeGrip } from './resize-grip.js';
import type { KerfUiContent } from './semantic-content.js';
import {
  WORKBENCH_MAIN_MIN_SIZE,
  WORKBENCH_RESIZE_DEFAULTS,
  type WorkbenchPanelKey,
  workbenchRegionId,
} from './workbench-resize.js';

/**
 * The Workbench container breakpoint below which a panel presents as an
 * overlay: `narrow` (704px or less) or `compact` (448px or less) — the same
 * breakpoints as `ResizableRegion`'s `responsiveFillAt`.
 */
export type WorkbenchResponsiveOverlayAt = 'compact' | 'narrow';

/** Drag-resize limits for a resizable Workbench panel, in px. */
export interface WorkbenchPanelResizable {
  /** Smallest size (default 180 for a rail, 120 for the drawer). */
  min?: number;
  /** Largest size (default 480). */
  max?: number;
}

/** A collapsible Workbench panel — a side rail or the bottom drawer. */
export interface WorkbenchPanel {
  content: KerfUiContent;
  /** Whether the panel is currently collapsed (the app owns this). */
  collapsed?: boolean;
  /**
   * Rail width, or drawer height, in px. Overrides the CSS default. For a
   * resizable panel it is the current size (default 280 for a rail, 220 for
   * the drawer), clamped to the limits; the app owns it and `wireWorkbench`
   * reports each resize.
   */
  size?: number;
  /**
   * Opt in to drag and keyboard resizing on the panel's inner separator:
   * `true` for the default limits, or `{ min, max }`. Off by default. Pair it
   * with `wireWorkbench` from `@kerfjs/ui/wire-workbench`.
   */
  resizable?: boolean | WorkbenchPanelResizable;
  /** Accessible name for the panel region. */
  label?: string;
  separator?: ResizableRegionSeparator;
  collapseMotion?: ResizableRegionCollapseMotion;
  contentOverflow?: ResizableRegionContentOverflow;
  presentation?: ResizableRegionPresentation;
  /**
   * Present the panel as an overlay, without a separator, below a Workbench
   * container breakpoint, and inline above it — the CSS decides, so the app
   * needs no device-class check. A rail overlays from its side at full
   * height; the bottom drawer overlays the bottom of the work-area column.
   */
  responsiveOverlayAt?: WorkbenchResponsiveOverlayAt;
  /** Control shown in a safe-area-aware viewport corner while collapsed. */
  restoreControl?: SafeHtml;
  restorePosition?: ResizableRegionRestorePosition;
}

export interface WorkbenchProps {
  id: string;
  label: string;
  /** The central work area. */
  main: KerfUiContent;
  leftRail?: WorkbenchPanel;
  rightRail?: WorkbenchPanel;
  bottomDrawer?: WorkbenchPanel;
  /**
   * Minimum width, in px, the work area keeps while a rail is `resizable`
   * (default 320; `0` turns it off). Resizing a rail stops where the work area
   * would drop below it, and resizable rails shrink proportionally when the
   * Workbench gets narrower. Workbenches without a resizable rail ignore it.
   */
  mainMinSize?: number;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

interface ResolvedResize {
  regionId: string;
  axis: ResizableRegionAxis;
  edge: ResizableRegionEdge;
  size: number;
  min: number;
  max: number;
}

/**
 * Each panel's separator is its inner edge. Growing the left rail moves that
 * edge toward the inline end; growing the right rail or the drawer moves it
 * toward the start — the same edge vocabulary `ResizableRegion` uses.
 */
const EDGES: Record<WorkbenchPanelKey, ResizableRegionEdge> = {
  leftRail: 'end',
  rightRail: 'start',
  bottomDrawer: 'start',
};

const DEFAULT_LABELS: Record<WorkbenchPanelKey, string> = {
  leftRail: 'left rail',
  rightRail: 'right rail',
  bottomDrawer: 'bottom drawer',
};

function resolveResize(
  id: string,
  key: WorkbenchPanelKey,
  panel: WorkbenchPanel,
): ResolvedResize | undefined {
  if (!panel.resizable) return undefined;
  const defaults = WORKBENCH_RESIZE_DEFAULTS[key];
  const limits = panel.resizable === true ? {} : panel.resizable;
  const min = limits.min ?? defaults.min;
  const max = Math.max(min, limits.max ?? defaults.max);
  return {
    regionId: workbenchRegionId(id, key),
    axis: key === 'bottomDrawer' ? 'vertical' : 'horizontal',
    edge: EDGES[key],
    size: clampRegionSize(panel.size ?? defaults.size, min, max),
    min,
    max,
  };
}

/** The attributes a resizable panel adds for the resize wiring to read. */
const resizeAttributes = (resize: ResolvedResize | undefined) =>
  resize
    ? {
        'data-resizable': 'true',
        'data-region-id': resize.regionId,
        'data-axis': resize.axis,
        'data-edge': resize.edge,
      }
    : {};

/**
 * A resizable panel's size lives in the resize wiring's track property, so a
 * drag or key press resizes the panel before the app re-renders; the CSS maps
 * it onto the rail width or drawer height.
 */
function panelStyle(
  panel: WorkbenchPanel,
  resize: ResolvedResize | undefined,
  sizeProperty: string,
) {
  if (resize) return `--kui-resizable-region-size:${resize.size}px`;
  return panel.size ? `${sizeProperty}: ${panel.size}px` : undefined;
}

/**
 * The separator a resizable panel owns: the same focusable `role="separator"`
 * contract a `ResizableRegion` handle carries, so one resize wiring drives
 * both. It leaves the tab order while the panel is collapsed or not inline.
 */
function PanelHandle({
  panel,
  resize,
  label,
}: {
  panel: WorkbenchPanel;
  resize: ResolvedResize;
  label: string;
}) {
  const inert =
    Boolean(panel.collapsed) || (panel.presentation ?? 'inline') !== 'inline';
  return (
    <div
      class="kui-workbench__handle"
      role="separator"
      tabindex={inert ? '-1' : '0'}
      aria-label={`Resize ${label}`}
      aria-orientation={
        resize.axis === 'horizontal' ? 'vertical' : 'horizontal'
      }
      aria-valuemin={resize.min}
      aria-valuemax={resize.max}
      aria-valuenow={resize.size}
      aria-hidden={inert ? 'true' : undefined}
      data-kui-resize-handle
      data-region-id={resize.regionId}
    >
      <span class="kui-workbench__handle-icon" aria-hidden="true">
        <ResizeGrip axis={resize.axis} />
      </span>
    </div>
  );
}

function Rail({
  id,
  side,
  panel,
}: {
  id: string;
  side: 'left' | 'right';
  panel: WorkbenchPanel;
}) {
  const key: WorkbenchPanelKey = side === 'left' ? 'leftRail' : 'rightRail';
  const resize = resolveResize(id, key, panel);
  return (
    <aside
      class={`kui-workbench__rail kui-workbench__rail--${side}`}
      data-workbench-rail={side}
      data-collapsed={String(panel.collapsed ?? false)}
      data-separator={panel.separator ?? 'auto'}
      data-collapse-motion={panel.collapseMotion ?? 'slide'}
      data-content-overflow={panel.contentOverflow ?? 'clip'}
      data-presentation={panel.presentation ?? 'inline'}
      data-responsive-overlay-at={panel.responsiveOverlayAt}
      {...resizeAttributes(resize)}
      aria-label={panel.label || undefined}
      aria-hidden={panel.presentation === 'hidden' ? 'true' : undefined}
      style={panelStyle(panel, resize, '--kui-workbench-rail-width')}
    >
      <div class="kui-workbench__panel-content">{panel.content}</div>
      {resize && (
        <PanelHandle
          panel={panel}
          resize={resize}
          label={panel.label || DEFAULT_LABELS[key]}
        />
      )}
    </aside>
  );
}

function Drawer({ id, panel }: { id: string; panel: WorkbenchPanel }) {
  const resize = resolveResize(id, 'bottomDrawer', panel);
  return (
    <section
      class="kui-workbench__drawer"
      data-workbench-drawer
      data-collapsed={String(panel.collapsed ?? false)}
      data-separator={panel.separator ?? 'auto'}
      data-collapse-motion={panel.collapseMotion ?? 'slide'}
      data-content-overflow={panel.contentOverflow ?? 'clip'}
      data-presentation={panel.presentation ?? 'inline'}
      data-responsive-overlay-at={panel.responsiveOverlayAt}
      {...resizeAttributes(resize)}
      aria-label={panel.label || undefined}
      aria-hidden={panel.presentation === 'hidden' ? 'true' : undefined}
      style={panelStyle(panel, resize, '--kui-workbench-drawer-height')}
    >
      <div class="kui-workbench__panel-content">{panel.content}</div>
      {resize && (
        <PanelHandle
          panel={panel}
          resize={resize}
          label={panel.label || DEFAULT_LABELS.bottomDrawer}
        />
      )}
    </section>
  );
}

/** A collapsed panel's restore control, outside the clipped panel. */
function restore(
  panel: WorkbenchPanel | undefined,
  side: 'left' | 'right' | 'bottom',
  position: ResizableRegionRestorePosition,
) {
  if (
    !panel?.collapsed ||
    !panel.restoreControl ||
    panel.presentation === 'hidden'
  )
    return '';
  return (
    <div
      class="kui-workbench__restore"
      data-panel={side}
      data-position={panel.restorePosition ?? position}
    >
      {panel.restoreControl}
    </div>
  );
}

/**
 * The Xcode-like multi-panel workspace: a collapsible left rail, right rail, and
 * bottom drawer around a central work area (any absent). Collapsing snaps the
 * panel's track to zero in one reflow while its fixed-size content slides out via
 * a composited transform — the instant-width / sliding-content technique, so the
 * work area relayouts once, not per frame. Bottom-drawer content stays anchored
 * to the shell's stable bottom edge throughout that transition. The app owns
 * each `collapsed` flag; the collapse is pure CSS. A panel may opt in to drag
 * and keyboard resizing with `resizable`, which `wireWorkbench` drives. See
 * `docs/23-app-layouts.md` §3.3.
 */
export function Workbench({
  id,
  label,
  main,
  leftRail,
  rightRail,
  bottomDrawer,
  mainMinSize = WORKBENCH_MAIN_MIN_SIZE,
  className = '',
  slot,
}: WorkbenchProps) {
  // The work-area minimum only applies beside a resizable rail; a fixed rail
  // keeps its size, so the shell renders exactly as before without one.
  const mainMin =
    leftRail?.resizable || rightRail?.resizable
      ? Math.max(0, Math.round(mainMinSize))
      : undefined;
  return (
    <section
      class={`kui-workbench ${className}`.trim()}
      id={id}
      data-component="workbench"
      data-main-min-size={mainMin === undefined ? undefined : String(mainMin)}
      style={
        mainMin === undefined
          ? undefined
          : `--_kui-workbench-main-min-width:${mainMin}px`
      }
      aria-label={label}
      slot={slot}
    >
      {leftRail && <Rail id={id} side="left" panel={leftRail} />}
      {restore(leftRail, 'left', 'bottom-start')}
      <div class="kui-workbench__center">
        <div class="kui-workbench__main" data-workbench-main>
          {main}
        </div>
        {bottomDrawer && <Drawer id={id} panel={bottomDrawer} />}
        {restore(bottomDrawer, 'bottom', 'bottom-end')}
      </div>
      {rightRail && <Rail id={id} side="right" panel={rightRail} />}
      {restore(rightRail, 'right', 'bottom-end')}
    </section>
  );
}
