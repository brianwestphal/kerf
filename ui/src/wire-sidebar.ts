import { delegate, effect, type ReadonlySignal, type Signal } from 'kerfjs';

import type { DeviceClass } from './device-class.js';

/** Minimal `localStorage`-shaped store, so the persistence hook is testable. */
export interface SidebarStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface WireSidebarPanel {
  /** The panel id — matches `CollapsiblePanel`'s `id` and a toggle's `panelId`. */
  id: string;
  /** The app-owned collapsed signal. `wireSidebar` reads it (focus, overlay) and
   *  writes it (toggle, Escape, backdrop, persistence). */
  collapsed: Signal<boolean>;
  /** `data-action` value the panel's toggle button(s) carry. */
  toggleAction: string;
  /** When set, the collapsed state is loaded from and saved to `storage` under
   *  this key (a persistence hook), so the panel remembers its state. */
  storageKey?: string;
}

export interface WireSidebarOptions {
  panels: readonly WireSidebarPanel[];
  /**
   * When provided, the sidebar adopts a compact **overlay** presentation while
   * `deviceClass.compact` is true: an open panel floats over the content with a
   * dismissable backdrop, Escape and backdrop-click collapse it, and focus is
   * trapped within the open panel (the ARIA dialog pattern). Without it the panel
   * is always inline.
   */
  deviceClass?: ReadonlySignal<DeviceClass>;
  /** Persistence store (default `globalThis.localStorage`, if present). */
  storage?: SidebarStorage;
}

const FOCUSABLE = 'a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusables(panel: HTMLElement): HTMLElement[] {
  // Focus only ever targets an OPEN panel, so the selector (which already drops
  // disabled controls and tabindex="-1") is sufficient without a layout-based
  // visibility check that a headless DOM can't answer.
  return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
}

function defaultStorage(): SidebarStorage | undefined {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * The reusable sidebar-semantics layer for {@link CollapsiblePanel}s: toggle
 * delegation with focus restore, focus-into on open, an optional compact overlay
 * (backdrop + Escape + focus trap) driven by {@link deviceClass}, and an optional
 * persistence hook. The app owns each `collapsed` signal and the layout; this wire
 * owns the interaction. Returns a disposer. See `docs/24-collapsible-panel.md`.
 */
export function wireSidebar(root: HTMLElement, { panels, deviceClass, storage = defaultStorage() }: WireSidebarOptions): () => void {
  const ownerDocument = root.ownerDocument;
  const byAction = new Map(panels.map((panel) => [panel.toggleAction, panel]));
  const returnFocus = new Map<string, HTMLElement>();
  const disposers: Array<() => void> = [];

  // Persistence: seed from storage, then mirror on change.
  for (const panel of panels) {
    if (!panel.storageKey || !storage) continue;
    const stored = storage.getItem(panel.storageKey);
    if (stored === 'true' || stored === 'false') panel.collapsed.value = stored === 'true';
    disposers.push(effect(() => {
      storage.setItem(panel.storageKey!, String(panel.collapsed.value));
    }));
  }

  const panelElement = (id: string): HTMLElement | null => root.querySelector<HTMLElement>(`[data-collapsible-panel="${id}"]`);

  const collapse = (panel: WireSidebarPanel): void => {
    if (panel.collapsed.value) return;
    panel.collapsed.value = true;
  };

  // Toggle delegation. The trigger is remembered so focus restores to it on close.
  disposers.push(delegate(root, 'click', '[data-action]', (_event, element) => {
    const trigger = element as HTMLElement;
    const panel = byAction.get(trigger.dataset.action ?? '');
    if (!panel) return;
    returnFocus.set(panel.id, trigger);
    panel.collapsed.value = !panel.collapsed.value;
  }));

  // Focus: move into the panel when it opens; restore to the trigger when it closes.
  for (const panel of panels) {
    let previous = panel.collapsed.value;
    disposers.push(effect(() => {
      const collapsed = panel.collapsed.value;
      if (collapsed === previous) return;
      previous = collapsed;
      const element = panelElement(panel.id);
      if (!collapsed && element) {
        (focusables(element)[0] ?? element).focus();
      } else if (collapsed) {
        returnFocus.get(panel.id)?.focus();
      }
    }));
  }

  // Compact overlay: a dismissable backdrop + Escape + focus trap while compact
  // and a panel is open.
  if (deviceClass) {
    let backdrop: HTMLButtonElement | undefined;
    const openPanel = (): WireSidebarPanel | undefined => panels.find((panel) => !panel.collapsed.value);
    const removeBackdrop = (): void => {
      backdrop?.remove();
      backdrop = undefined;
    };
    disposers.push(effect(() => {
      const compact = deviceClass.value.compact;
      const open = compact ? openPanel() : undefined;
      root.dataset.collapsibleOverlay = String(compact);
      if (compact && open) {
        if (!backdrop) {
          backdrop = ownerDocument.createElement('button');
          backdrop.type = 'button';
          backdrop.className = 'kui-collapsible-panel__backdrop';
          backdrop.setAttribute('aria-label', 'Close');
          backdrop.addEventListener('click', () => collapse(open));
          const element = panelElement(open.id);
          element?.parentElement?.insertBefore(backdrop, element);
        }
      } else {
        removeBackdrop();
        if (!compact) delete root.dataset.collapsibleOverlay;
      }
    }));

    const onKeydown = (event: KeyboardEvent): void => {
      if (!deviceClass.value.compact) return;
      const open = openPanel();
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        collapse(open);
        return;
      }
      if (event.key !== 'Tab') return;
      const element = panelElement(open.id);
      if (!element) return;
      const items = focusables(element);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = ownerDocument.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    ownerDocument.addEventListener('keydown', onKeydown);
    disposers.push(() => ownerDocument.removeEventListener('keydown', onKeydown));
    disposers.push(removeBackdrop);
  }

  return () => {
    for (const dispose of disposers.splice(0)) dispose();
    delete root.dataset.collapsibleOverlay;
  };
}
