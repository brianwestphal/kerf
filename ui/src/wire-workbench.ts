import { effect, type ReadonlySignal, type Signal } from 'kerfjs';

import type { DeviceClass } from './device-class.js';
import { type ResizeLimit, wireResizeHandles } from './resize-wiring.js';
import {
  wireWorkbenchOverlays,
  type WorkbenchOverlayPanel,
} from './workbench-overlays.js';
import {
  type WorkbenchPanelKey,
  workbenchRegionId,
} from './workbench-resize.js';

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
   * back when the breakpoint stops applying, and an open overlay closes on
   * Escape or a press outside it.
   */
  collapsed?: Signal<boolean>;
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
   * or a press that starts and ends outside it. Focus stranded in a closing
   * panel — however it closed, the app's own control inside it included —
   * returns to the control that had it when the panel opened, else to the
   * panel's restore control. `false` leaves every `collapsed` write to the
   * app.
   */
  dismissOverlays?: boolean;
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
 * The largest size a resizable rail may take while the work area keeps its
 * minimum width (the Workbench's `mainMinSize`, rendered as
 * `data-main-min-size`): the Workbench width, less that minimum, the other
 * in-flow rails as shown, and the rail's own safe-area extent and border. A
 * rail that the container has already squeezed is held at the width it shows,
 * so it can shrink but not grow. Without layout (no box yet) or a minimum,
 * the rail's own maximum stands; the drawer is vertical and unaffected.
 */
const mainRoomLimit: ResizeLimit = (region, { max }) => {
  const workbench = region.parentElement;
  const mainMin = Number(workbench?.dataset.mainMinSize);
  if (region.dataset.axis !== 'horizontal' || !workbench || !(mainMin > 0))
    return max;
  const width = workbench.getBoundingClientRect().width;
  if (width <= 0) return max;
  let others = 0;
  for (const rail of workbench.children) {
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
      : px(style.borderInlineStartWidth) + px(style.borderInlineEndWidth);
  // The track is the size plus the rail's safe-area extent (its flex basis).
  const extent = px(style.flexBasis) - size + border;
  return Math.floor(width - Math.min(mainMin, width) - others - extent);
};

/**
 * Wire a `Workbench`'s panels. For `resizable` panels given a `size` signal:
 * pointer drags and arrow / Shift+arrow / Home / End on each panel's
 * separator, clamped to the panel's limits and to the room that leaves the
 * work area its minimum width, committed to the app-owned size signals.
 * Optional persistence loads and saves each size; optional `deviceClass`
 * suspends resizing on compact classes. Collapse stays the app's `collapsed`
 * flag and never changes a size. For panels given a `collapsed` signal,
 * overlays are transient (`dismissOverlays`): a responsive overlay starts
 * collapsed, and an open overlay closes on Escape or an outside press.
 * Returns a disposer. See `docs/23-app-layouts.md` §3.3.
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
    return collapsed ? [{ key, collapsed }] : [];
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
      ),
    );
  }

  return () => {
    stopResize?.();
    stopResize = undefined;
    for (const dispose of disposers.splice(0)) dispose();
  };
}
