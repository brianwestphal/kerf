import { effect, type ReadonlySignal, type Signal } from 'kerfjs';

import type { DeviceClass } from './device-class.js';
import { wireResizeHandles } from './resize-wiring.js';
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

/** One resizable Workbench panel's app-owned state. */
export interface WireWorkbenchPanel {
  /**
   * The app-owned size signal the panel renders as its `size`. `wireWorkbench`
   * writes each committed resize here; collapsing never touches it, so an
   * expanded panel returns at the size it had.
   */
  size: Signal<number>;
  /**
   * When set, the size is loaded from and saved to `storage` under this key,
   * so the panel remembers the user's size.
   */
  storageKey?: string;
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
   * The resizable panels, keyed like the `Workbench` props. Render each with
   * `resizable` and `size={panel.size.value}`.
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

/**
 * Wire the opt-in drag and keyboard resizing of a `Workbench`'s `resizable`
 * panels: pointer drags and arrow / Shift+arrow / Home / End on each panel's
 * separator, clamped to the panel's limits, committed to the app-owned size
 * signals. Optional persistence loads and saves each size; optional
 * `deviceClass` suspends resizing on compact classes. Collapse stays the app's
 * `collapsed` flag and never changes a size. Returns a disposer. See
 * `docs/23-app-layouts.md` §3.3.
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
  }: WireWorkbenchOptions,
): () => void {
  const entries = (Object.keys(panels) as WorkbenchPanelKey[]).flatMap(
    (key) => {
      const panel = panels[key];
      return panel
        ? [{ key, panel, regionId: workbenchRegionId(id, key) }]
        : [];
    },
  );
  const byRegion = new Map(entries.map((entry) => [entry.regionId, entry]));
  const disposers: Array<() => void> = [];

  // Seed from storage before any effect runs, so the first render after
  // wire-up already has the remembered size; then mirror every size change.
  for (const { panel } of entries) {
    if (!panel.storageKey || !storage) continue;
    const seed = storedSize(storage.getItem(panel.storageKey));
    if (seed !== undefined) panel.size.value = seed;
    disposers.push(
      effect(() => {
        storage.setItem(panel.storageKey!, String(panel.size.value));
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
          entry.panel.size.value = size;
          onResize?.({ panel: entry.key, size, source });
        },
      },
      selector,
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

  return () => {
    stopResize?.();
    stopResize = undefined;
    for (const dispose of disposers.splice(0)) dispose();
  };
}
