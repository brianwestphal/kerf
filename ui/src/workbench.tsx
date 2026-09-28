import type { SafeHtml } from 'kerfjs';

import type { ListConfig } from './list.js';
import type { PaneConfig } from './pane.js';
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
  WORKBENCH_MAIN_MIN_HEIGHT,
  WORKBENCH_MAIN_MIN_SIZE,
  WORKBENCH_RESIZE_DEFAULTS,
  type WorkbenchPanelKey,
  workbenchRegionId,
} from './workbench-resize.js';
import {
  floatingRestore,
  mainBody,
  panelBody,
  type WorkbenchChromePlacement,
  type WorkbenchMainBottomToolbar,
  type WorkbenchMainToolbar,
  type WorkbenchPanelToolbar,
} from './workbench-toolbars.js';

export type {
  WorkbenchChromePlacement,
  WorkbenchMainBottomToolbar,
  WorkbenchMainToolbar,
  WorkbenchPanelToggle,
  WorkbenchPanelToolbar,
} from './workbench-toolbars.js';

/**
 * The Workbench container breakpoint below which a panel presents as an
 * overlay: `narrow` (704px or less) or `compact` (448px or less) — the same
 * breakpoints as `ResizableRegion`'s `responsiveFillAt` — or `never` to keep
 * it inline at every width.
 */
export type WorkbenchResponsiveOverlayAt = 'compact' | 'narrow' | 'never';

/**
 * How wide a rail's overlay is in a compact (448px or less) Workbench: `inset`
 * fills the Workbench less a dismiss margin on the side away from the rail's
 * edge, so a press beside it closes it; `full` fills the Workbench.
 */
export type WorkbenchCompactOverlay = 'inset' | 'full';

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
  /**
   * The panel's top toolbar, composed by the Workbench: its `constant` groups
   * and standard `toggle` move to the work area's toolbar while the panel is
   * collapsed. With it, `content` renders in a `Pane` below the toolbar.
   */
  toolbar?: WorkbenchPanelToolbar;
  /** Optional bottom toolbar under a `toolbar` panel's content. */
  footer?: KerfUiContent;
  /**
   * Configuration for a `toolbar` panel's `Pane` (`contentElement`,
   * `contentLabel`, `separators`, `safeAreaEdges`) — for example
   * `{ contentElement: 'nav', contentLabel: 'Sections' }` for a navigation
   * rail. Omitted or `undefined` fields keep the `Pane` defaults. Ignored
   * without a `toolbar`, where `content` renders as given.
   */
  pane?: PaneConfig;
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
   * height, over the work area and an open drawer; the bottom drawer
   * overlays the bottom of the work-area column. Rails default to `narrow`
   * (pass `never` to keep one inline); the drawer defaults to inline.
   */
  responsiveOverlayAt?: WorkbenchResponsiveOverlayAt;
  /**
   * A rail's overlay width in a compact Workbench (default `inset`: the
   * Workbench less `--kui-workbench-overlay-dismiss-margin`, 44px). Ignored
   * by the drawer.
   */
  compactOverlay?: WorkbenchCompactOverlay;
  /**
   * Control shown while collapsed, in a safe-area-aware corner of the
   * Workbench (not the viewport); the bottom drawer's sits in the work-area
   * column. Prefer `toolbar.toggle`, which the Workbench relocates into the
   * work area's toolbar (or this corner when that toolbar is absent).
   */
  restoreControl?: SafeHtml;
  restorePosition?: ResizableRegionRestorePosition;
}

export interface WorkbenchProps {
  /**
   * The Workbench's `id`. Each panel's `id` derives from it —
   * `<id>-left-rail`, `<id>-right-rail`, `<id>-bottom-drawer` — so a toggle
   * can name the panel it shows and hides with `aria-controls`.
   */
  id: string;
  label: string;
  /** The central work area. */
  main: KerfUiContent;
  /**
   * The work area's top toolbar. A collapsed left rail's `constant` groups
   * and toggle lead it; a collapsed right rail's trail it. With it, `main`
   * renders in a `Pane` below the toolbar.
   */
  mainToolbar?: WorkbenchMainToolbar;
  /**
   * Fixed content under `mainToolbar` — supporting copy such as a
   * description — divided from the scrolling `main` below it.
   */
  mainHeader?: KerfUiContent;
  /**
   * Fixed content over `mainBottomToolbar` — a status line or a resource
   * toolbar — divided from the scrolling `main` above it.
   */
  mainFooter?: KerfUiContent;
  /**
   * The work area's bottom toolbar. A collapsed drawer's `constant` groups and
   * toggle trail it; without it they float in the work area's corner.
   */
  mainBottomToolbar?: WorkbenchMainBottomToolbar;
  /**
   * Whether `mainToolbar` and `mainHeader` stay pinned (`fixed`, default) or
   * scroll away with `main` (`scroll`) — useful where large text would leave
   * pinned chrome little room.
   */
  mainHeaderPlacement?: WorkbenchChromePlacement;
  /** The same for `mainFooter` and `mainBottomToolbar` (default `fixed`). */
  mainFooterPlacement?: WorkbenchChromePlacement;
  /**
   * Configuration for the work area's `Pane` (`contentElement`,
   * `contentLabel`, `separators`, `safeAreaEdges`), which it has whenever it
   * has a toolbar, `mainHeader`, or `mainFooter`; without that chrome, `main`
   * renders as given and this is ignored. Omitted or `undefined` fields keep
   * the `Pane` defaults.
   */
  mainPane?: PaneConfig;
  /**
   * Configuration for the `List` that holds `mainHeader` (`gap`, `hAlign`,
   * `vAlign`, `dividerSides`, `textInsets`, `controlInsets`). Omitted or
   * `undefined` fields keep the defaults, including its bottom divider.
   */
  mainHeaderList?: ListConfig;
  /**
   * The same for the `List` that holds `mainFooter`; by default it draws a
   * top divider, or none when a `mainBottomToolbar` follows it.
   */
  mainFooterList?: ListConfig;
  leftRail?: WorkbenchPanel;
  rightRail?: WorkbenchPanel;
  bottomDrawer?: WorkbenchPanel;
  /**
   * Minimum width, in px, the work area keeps beside the inline rails, fixed
   * or `resizable` (default 320; `0` turns it off). Resizing a rail stops
   * where the work area would drop below it, and inline rails shrink
   * proportionally when the Workbench gets narrower. Workbenches without a
   * rail ignore it.
   */
  mainMinSize?: number;
  /**
   * Minimum height, in px, the work area keeps above an inline bottom drawer,
   * fixed or `resizable` (default 120; `0` turns it off) — the drawer's
   * counterpart of `mainMinSize`. Resizing the drawer stops where the work
   * area would drop below it, and the drawer shrinks when the Workbench gets
   * shorter. Workbenches without a drawer ignore it.
   */
  mainMinHeight?: number;
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

/**
 * A collapsed panel leaves the accessibility tree as a whole, like a collapsed
 * `CollapsiblePanel`: its content and separator are already inert or hidden,
 * so the labeled landmark would otherwise stay behind, empty, for a screen
 * reader to land on. Its restore control renders outside it and stays
 * reachable.
 */
function hiddenFromAccessibility(panel: WorkbenchPanel) {
  return panel.collapsed || panel.presentation === 'hidden'
    ? ('true' as const)
    : undefined;
}

/** A breakpoint's attribute value; `never` (or none) renders no attribute. */
const responsiveAt = (at: WorkbenchResponsiveOverlayAt | undefined) =>
  at === 'never' ? undefined : at;

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
      id={workbenchRegionId(id, key)}
      class={`kui-workbench__rail kui-workbench__rail--${side}`}
      data-workbench-rail={side}
      data-collapsed={String(panel.collapsed ?? false)}
      data-separator={panel.separator ?? 'auto'}
      data-collapse-motion={panel.collapseMotion ?? 'slide'}
      data-content-overflow={panel.contentOverflow ?? 'clip'}
      data-presentation={panel.presentation ?? 'inline'}
      data-responsive-overlay-at={responsiveAt(
        panel.responsiveOverlayAt ?? 'narrow',
      )}
      data-compact-overlay={panel.compactOverlay ?? 'inset'}
      {...resizeAttributes(resize)}
      aria-label={panel.label || undefined}
      aria-hidden={hiddenFromAccessibility(panel)}
      inert={Boolean(panel.collapsed)}
      style={panelStyle(panel, resize, '--kui-workbench-rail-width')}
    >
      <div
        class="kui-workbench__panel-content"
        inert={Boolean(panel.collapsed)}
      >
        {panelBody(id, key, panel)}
      </div>
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
      id={workbenchRegionId(id, 'bottomDrawer')}
      class="kui-workbench__drawer"
      data-workbench-drawer
      data-collapsed={String(panel.collapsed ?? false)}
      data-separator={panel.separator ?? 'auto'}
      data-collapse-motion={panel.collapseMotion ?? 'slide'}
      data-content-overflow={panel.contentOverflow ?? 'clip'}
      data-presentation={panel.presentation ?? 'inline'}
      data-responsive-overlay-at={responsiveAt(panel.responsiveOverlayAt)}
      {...resizeAttributes(resize)}
      aria-label={panel.label || undefined}
      aria-hidden={hiddenFromAccessibility(panel)}
      inert={Boolean(panel.collapsed)}
      style={panelStyle(panel, resize, '--kui-workbench-drawer-height')}
    >
      <div
        class="kui-workbench__panel-content"
        inert={Boolean(panel.collapsed)}
      >
        {panelBody(id, 'bottomDrawer', panel)}
      </div>
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
  generated: SafeHtml | undefined,
) {
  const control = panel?.restoreControl ?? generated;
  if (!panel?.collapsed || !control || panel.presentation === 'hidden')
    return '';
  return (
    <div
      class="kui-workbench__restore"
      data-panel={side}
      data-position={panel.restorePosition ?? position}
    >
      {control}
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
 * each `collapsed` flag; the collapse is pure CSS. A collapsed panel renders
 * `inert` and `aria-hidden`, so neither Tab nor assistive technology reaches
 * controls that have slid out of view or an empty landmark (its restore control
 * lives outside it and stays reachable). A panel may opt in to drag and keyboard resizing with
 * `resizable`, which `wireWorkbench` drives. See `docs/23-app-layouts.md` §3.3.
 */
export function Workbench({
  id,
  label,
  main,
  leftRail,
  rightRail,
  bottomDrawer,
  mainToolbar,
  mainHeader,
  mainFooter,
  mainBottomToolbar,
  mainHeaderPlacement,
  mainFooterPlacement,
  mainPane,
  mainHeaderList,
  mainFooterList,
  mainMinSize = WORKBENCH_MAIN_MIN_SIZE,
  mainMinHeight = WORKBENCH_MAIN_MIN_HEIGHT,
  className = '',
  slot,
}: WorkbenchProps) {
  // Each work-area minimum applies only on an axis a panel shares with it:
  // the width beside a rail, the height above the drawer.
  const px = (value: number) => Math.max(0, Math.round(value));
  const mainMin = leftRail || rightRail ? px(mainMinSize) : undefined;
  const mainMinBlock = bottomDrawer ? px(mainMinHeight) : undefined;
  const style = [
    mainMin === undefined ? '' : `--_kui-workbench-main-min-width:${mainMin}px`,
    mainMinBlock === undefined
      ? ''
      : `--_kui-workbench-main-min-height:${mainMinBlock}px`,
  ]
    .filter(Boolean)
    .join(';');
  return (
    <section
      class={`kui-workbench ${className}`.trim()}
      id={id}
      data-component="workbench"
      data-main-min-size={mainMin === undefined ? undefined : String(mainMin)}
      data-main-min-height={
        mainMinBlock === undefined ? undefined : String(mainMinBlock)
      }
      style={style || undefined}
      aria-label={label}
      slot={slot}
    >
      {leftRail && <Rail id={id} side="left" panel={leftRail} />}
      {restore(
        leftRail,
        'left',
        'bottom-start',
        floatingRestore(id, 'leftRail', leftRail, Boolean(mainToolbar)),
      )}
      <div class="kui-workbench__center">
        <div class="kui-workbench__main" data-workbench-main>
          {mainBody({
            workbenchId: id,
            main,
            mainToolbar,
            mainHeader,
            mainFooter,
            mainBottomToolbar,
            mainHeaderPlacement,
            mainFooterPlacement,
            mainPane,
            mainHeaderList,
            mainFooterList,
            leftRail,
            rightRail,
            bottomDrawer,
          })}
        </div>
        {bottomDrawer && <Drawer id={id} panel={bottomDrawer} />}
        {restore(
          bottomDrawer,
          'bottom',
          'bottom-end',
          floatingRestore(
            id,
            'bottomDrawer',
            bottomDrawer,
            Boolean(mainBottomToolbar),
          ),
        )}
      </div>
      {rightRail && <Rail id={id} side="right" panel={rightRail} />}
      {restore(
        rightRail,
        'right',
        'bottom-end',
        floatingRestore(id, 'rightRail', rightRail, Boolean(mainToolbar)),
      )}
    </section>
  );
}
