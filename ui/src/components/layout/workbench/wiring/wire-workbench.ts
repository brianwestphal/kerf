import { effect, type ReadonlySignal, type Signal } from 'kerfjs';

import type { DeviceClass } from '../../../../shared/environment/device-class.js';
import {
  type ResizeLimit,
  wireResizeHandles,
} from '../../resizable-region/internal/resize-wiring.js';
import {
  wireWorkbenchOverlays,
  type WorkbenchOverlayPanel,
} from '../internal/workbench-overlays.js';
import {
  type WorkbenchPanelKey,
  workbenchRegionId,
} from '../internal/workbench-resize.js';

export type { WorkbenchPanelKey };

/** Minimal `localStorage`-shaped store, so the persistence hook is testable. */
export interface WorkbenchStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** One Workbench panel's app-owned state. */
export interface WireWorkbenchPanel {
  /**
   * The app-owned size signal a `resizable` panel renders as its `size`.
   * `wireWorkbench` writes each committed resize here; collapsing never
   * touches it, so an expanded panel returns at the size it had. Omit it for
   * a panel that is not resizable.
   */
  size?: Signal<number>;
  /**
   * When set with `size`, the size is loaded from and saved to `storage`
   * under this key, so the panel remembers the user's size.
   */
  storageKey?: string;
  /**
   * The app-owned signal the panel renders as its `collapsed`. With it (and
   * `dismissOverlays`, on by default) `wireWorkbench` treats the panel as a
   * transient overlay while it presents as one: it collapses when its
   * `responsiveOverlayAt` breakpoint begins to apply and gets its inline state
   * back when the breakpoint stops applying, an open overlay takes focus and
   * keeps Tab inside it, and it closes on Escape or a press outside it.
   */
  collapsed?: Signal<boolean>;
  /**
   * Treat presses in a portal surface launched by this panel (for example a
   * body-level menu or dialog) as inside it. The predicate receives each Node
   * in the press's composed path; return true for the portal root. Ordinary
   * presses outside the panel and its allowed surfaces still dismiss it.
   */
  keepOpenOn?: (target: Node) => boolean;
}

/** A resize the user made, after `wireWorkbench` wrote it to the size signal. */
export interface WorkbenchResize {
  panel: WorkbenchPanelKey;
  size: number;
  source: 'keyboard' | 'pointer';
}

export interface WireWorkbenchOptions {
  /** The `id` the `Workbench` was rendered with. */
  id: string;
  /**
   * The wired panels, keyed like the `Workbench` props. Render a panel given
   * a `size` with `resizable` and `size={panel.size.value}`, and one given a
   * `collapsed` signal with `collapsed={panel.collapsed.value}`.
   */
  panels: Partial<Record<WorkbenchPanelKey, WireWorkbenchPanel>>;
  /**
   * When provided, resizing is suspended while `deviceClass.compact` is true —
   * the classes where rails become overlay drawers or are replaced.
   */
  deviceClass?: ReadonlySignal<DeviceClass>;
  /** Persistence store (default `globalThis.localStorage`, if present). */
  storage?: WorkbenchStorage;
  /** Keyboard step in px (default 16). */
  step?: number;
  /** Shift+arrow step in px (default 64). */
  largeStep?: number;
  /** Called after each committed resize. */
  onResize?: (change: WorkbenchResize) => void;
  /**
   * Treat the panels given a `collapsed` signal as transient overlays while
   * they present as overlays (default `true`), like `wireSidebar`'s compact
   * overlay: a panel whose `responsiveOverlayAt` breakpoint begins to apply
   * starts collapsed, with no collapse motion, and gets its inline collapsed
   * state back when the breakpoint stops applying (and on disposal); an open
   * overlay panel, responsive or `presentation: "overlay"`, closes on Escape
   * or a press that starts and ends outside it. A panel that opens as an
   * overlay takes focus on its first focusable control, and while it is open
   * Tab and Shift+Tab cycle through its controls instead of reaching the
   * work area it covers (the ARIA dialog pattern of `wireSidebar`'s compact
   * overlay); inline panels never move focus. Focus stranded in a closing
   * panel — however it closed, the app's own control inside it included —
   * returns to the control that had it when the panel opened, else to the
   * panel's restore control, else to a control outside the panel whose
   * `aria-controls` names it (each panel's `id` is its region id, e.g.
   * `studio-left-rail`) — the fallback for a panel already open at wire-up.
   * An opener inside a panel that has closed since is skipped. `false` leaves
   * every `collapsed` write and all focus handling to the app.
   */
  dismissOverlays?: boolean;
  /**
   * Keep overlays exclusive (default `true`), like `wireSidebar`'s
   * `exclusiveCompact`: when a panel opens while it presents as an overlay,
   * every other open overlay panel — rails and the bottom drawer alike —
   * closes, so one overlay never covers another's controls. Panels presenting
   * inline are never closed by it. Applies only with `dismissOverlays`.
   */
  exclusiveOverlays?: boolean;
}

function defaultStorage(): WorkbenchStorage | undefined {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

/** A stored size, or undefined when the stored text is not a usable size. */
function storedSize(text: string | null) {
  if (text === null) return undefined;
  const size = Number(text);
  return Number.isFinite(size) && size > 0 ? Math.round(size) : undefined;
}

/** A double-quoted CSS attribute-selector value. */
const quoted = (value: string) =>
  `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

const px = (value: string) => Number.parseFloat(value) || 0;

/**
 * The largest size a resizable panel may take while the work area keeps its
 * minimum: for a rail, its minimum width (the Workbench's `mainMinSize`,
 * rendered as `data-main-min-size`) — the Workbench width, less that minimum,
 * the other in-flow rails as shown, and the rail's own safe-area extent and
 * border; for the bottom drawer, its minimum height (`mainMinHeight`, rendered
 * as `data-main-min-height`) — the work-area column's height, less that
 * minimum and the drawer's own safe-area extent and border. A panel the
 * container has already squeezed is held at the size it shows, so it can
 * shrink but not grow. Without layout (no box yet) or a minimum, the panel's
 * own maximum stands.
 */
const mainRoomLimit: ResizeLimit = (region, { max }) => {
  const horizontal = region.dataset.axis === 'horizontal';
  // A rail's parent is the Workbench; the drawer's is the work-area column.
  const container = region.parentElement;
  const workbench = horizontal ? container : container?.parentElement;
  const mainMin = Number(
    horizontal
      ? workbench?.dataset.mainMinSize
      : workbench?.dataset.mainMinHeight,
  );
  if (!container || !(mainMin > 0)) return max;
  const box = container.getBoundingClientRect();
  const room = horizontal ? box.width : box.height;
  if (room <= 0) return max;
  let others = 0;
  if (horizontal)
    for (const rail of container.children) {
      if (
        rail === region ||
        !rail.matches('.kui-workbench__rail') ||
        globalThis.getComputedStyle(rail).position === 'absolute'
      )
        continue;
      others += rail.getBoundingClientRect().width;
    }
  const style = globalThis.getComputedStyle(region);
  const size = px(region.style.getPropertyValue('--kui-resizable-region-size'));
  const border =
    style.boxSizing === 'border-box'
      ? 0
      : horizontal
        ? px(style.borderInlineStartWidth) + px(style.borderInlineEndWidth)
        : px(style.borderBlockStartWidth) + px(style.borderBlockEndWidth);
  // The track is the size plus the panel's safe-area extent (its flex basis).
  const extent = px(style.flexBasis) - size + border;
  return Math.floor(room - Math.min(mainMin, room) - others - extent);
};

/**
 * Wire a `Workbench`'s panels. For `resizable` panels given a `size` signal:
 * pointer drags and arrow / Shift+arrow / Home / End on each panel's
 * separator, clamped to the panel's limits and to the room that leaves the
 * work area its minimum width and height, committed to the app-owned size signals.
 * Optional persistence loads and saves each size; optional `deviceClass`
 * suspends resizing on compact classes. Collapse stays the app's `collapsed`
 * flag and never changes a size. For panels given a `collapsed` signal,
 * overlays are transient (`dismissOverlays`): a responsive overlay starts
 * collapsed, an open overlay takes focus and keeps Tab inside it, it closes
 * on Escape or an outside press, and
 * opening one overlay closes the others (`exclusiveOverlays`). Returns a disposer. See `docs/23-app-layouts.md` §3.3.
 */
export function wireWorkbench(
  root: HTMLElement,
  {
    id,
    panels,
    deviceClass,
    storage = defaultStorage(),
    step,
    largeStep,
    onResize,
    dismissOverlays = true,
    exclusiveOverlays = true,
  }: WireWorkbenchOptions,
): () => void {
  const keys = Object.keys(panels) as WorkbenchPanelKey[];
  const entries = keys.flatMap((key) => {
    const size = panels[key]?.size;
    return size
      ? [
          {
            key,
            size,
            storageKey: panels[key]!.storageKey,
            regionId: workbenchRegionId(id, key),
          },
        ]
      : [];
  });
  const byRegion = new Map(entries.map((entry) => [entry.regionId, entry]));
  const disposers: Array<() => void> = [];

  // Seed from storage before any effect runs, so the first render after
  // wire-up already has the remembered size; then mirror every size change.
  for (const { size, storageKey } of entries) {
    if (!storageKey || !storage) continue;
    const seed = storedSize(storage.getItem(storageKey));
    if (seed !== undefined) size.value = seed;
    disposers.push(
      effect(() => {
        storage.setItem(storageKey, String(size.value));
      }),
    );
  }

  // Each panel is matched by its own region id, so this wiring never drives a
  // ResizableRegion or another Workbench below the same root.
  const selector = entries
    .map(
      ({ regionId }) =>
        `[data-resizable="true"][data-region-id=${quoted(regionId)}]`,
    )
    .join(', ');
  const start = () =>
    wireResizeHandles(
      root,
      {
        step,
        largeStep,
        onCommit: ({ id: regionId, size, source }) => {
          // The selector only matches configured panels.
          const entry = byRegion.get(regionId)!;
          entry.size.value = size;
          onResize?.({ panel: entry.key, size, source });
        },
      },
      selector,
      mainRoomLimit,
    );

  let stopResize: (() => void) | undefined;
  if (selector) {
    if (deviceClass) {
      disposers.push(
        effect(() => {
          const compact = deviceClass.value.compact;
          stopResize?.();
          stopResize = compact ? undefined : start();
        }),
      );
    } else {
      stopResize = start();
    }
  }

  const overlayPanels = keys.flatMap((key): WorkbenchOverlayPanel[] => {
    const collapsed = panels[key]?.collapsed;
    return collapsed
      ? [{ key, collapsed, keepOpenOn: panels[key]?.keepOpenOn }]
      : [];
  });
  if (dismissOverlays && overlayPanels.length > 0) {
    const selector = `[data-component="workbench"][id=${quoted(id)}]`;
    disposers.push(
      wireWorkbenchOverlays(
        root,
        () =>
          root.matches(selector)
            ? root
            : root.querySelector<HTMLElement>(selector),
        overlayPanels,
        exclusiveOverlays,
      ),
    );
  }

  return () => {
    stopResize?.();
    stopResize = undefined;
    for (const dispose of disposers.splice(0)) dispose();
  };
}
