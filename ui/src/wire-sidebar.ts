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
  /** When set, the panel's inline collapsed state is loaded from and saved to
   *  `storage` under this key (a persistence hook), so the panel remembers the
   *  user's inline choice. A compact overlay's open/closed state is transient
   *  and is never persisted. */
  storageKey?: string;
  /** The panel's inline (non-compact) collapsed state when `storage` holds no
   *  choice for it; wire-up seeds the signal with it. Defaults to the signal's
   *  own value. Set it when the app seeds the signal from the device class
   *  (`signal(device.value.compact)`) so a compact first render already starts
   *  collapsed while a later crossing to a wide class still restores this
   *  inline default. */
  inlineCollapsed?: boolean;
}

export interface WireSidebarOptions {
  panels: readonly WireSidebarPanel[];
  /**
   * When provided, the sidebar adopts a compact **overlay** presentation while
   * `deviceClass.compact` is true: an open panel floats over the content with a
   * dismissable backdrop, Escape and backdrop-click collapse it, and focus is
   * trapped within the open panel (the ARIA dialog pattern). Without it the panel
   * is always inline.
   *
   * An overlay is transient and user-initiated: whenever the compact overlay
   * presentation begins (wire-up on a compact device, or a crossing from a wide
   * class), every panel starts collapsed so nothing blocks the page until the
   * user opens it. The inline state is remembered and restored when the device
   * crosses back to a wide class (and on disposal).
   */
  deviceClass?: ReadonlySignal<DeviceClass>;
  /** Compact devices either overlay the panels (default) or hide them in favor
   *  of an application-owned responsive replacement. */
  compactPresentation?: 'overlay' | 'hidden';
  /** Collapse the other panels when one opens in compact overlay mode. */
  exclusiveCompact?: boolean;
  /** Persistence store (default `globalThis.localStorage`, if present). */
  storage?: SidebarStorage;
}

const FOCUSABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

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
export function wireSidebar(
  root: HTMLElement,
  {
    panels,
    deviceClass,
    compactPresentation = 'overlay',
    exclusiveCompact = true,
    storage = defaultStorage(),
  }: WireSidebarOptions,
): () => void {
  const ownerDocument = root.ownerDocument;
  const byAction = new Map(panels.map((panel) => [panel.toggleAction, panel]));
  const returnFocus = new Map<string, HTMLElement>();
  const disposers: Array<() => void> = [];
  // Panels whose next collapsed change is presentation-driven, not a user
  // action, so it must not move focus the way a toggle does. A set rather than
  // a flag: writes made inside an effect are batched, so the focus effects run
  // after the writer returns.
  const adapting = new Set<WireSidebarPanel>();
  const overlayActive = (): boolean =>
    Boolean(deviceClass?.value.compact) && compactPresentation === 'overlay';

  // Initial-state contract: an overlay is transient and only ever opens on a
  // user action. Entering the overlay presentation (at wire-up or on a wide →
  // compact crossing) remembers each panel's inline state and collapses it;
  // leaving it (compact → wide, or disposal) restores the remembered state.
  let inlineState: Map<WireSidebarPanel, boolean> | undefined;
  const setAll = (value: (panel: WireSidebarPanel) => boolean): void => {
    for (const panel of panels) {
      const next = value(panel);
      if (panel.collapsed.peek() === next) continue;
      adapting.add(panel);
      panel.collapsed.value = next;
    }
  };
  const restoreInline = (): void => {
    const remembered = inlineState;
    if (!remembered) return;
    inlineState = undefined;
    setAll((panel) => remembered.get(panel)!);
  };

  // Seed each panel's inline state from storage or `inlineCollapsed`. On a
  // compact overlay device the seed is only remembered: the panel starts
  // collapsed, synchronously and before any effect exists, so the first render
  // after wire-up already has no overlay open.
  if (overlayActive()) inlineState = new Map();
  for (const panel of panels) {
    const stored =
      panel.storageKey && storage ? storage.getItem(panel.storageKey) : null;
    const seed =
      stored === 'true' || stored === 'false'
        ? stored === 'true'
        : panel.inlineCollapsed;
    if (inlineState) {
      inlineState.set(panel, seed ?? panel.collapsed.peek());
      panel.collapsed.value = true;
    } else if (seed !== undefined) {
      panel.collapsed.value = seed;
    }
  }

  // Persistence mirrors inline changes only. An overlay's open/closed state is
  // transient, so it is never written.
  for (const panel of panels) {
    if (!panel.storageKey || !storage) continue;
    disposers.push(
      effect(() => {
        const collapsed = panel.collapsed.value;
        if (overlayActive()) return;
        storage.setItem(panel.storageKey!, String(collapsed));
      }),
    );
  }

  const panelElement = (id: string): HTMLElement | null =>
    root.querySelector<HTMLElement>(`[data-collapsible-panel="${id}"]`);

  const collapse = (panel: WireSidebarPanel): void => {
    if (panel.collapsed.value) return;
    panel.collapsed.value = true;
  };

  // Toggle delegation. The trigger is remembered so focus restores to it on close.
  disposers.push(
    delegate(root, 'click', '[data-action]', (_event, element) => {
      const trigger = element as HTMLElement;
      const panel = byAction.get(trigger.dataset.action ?? '');
      if (!panel) return;
      returnFocus.set(panel.id, trigger);
      const next = !panel.collapsed.value;
      panel.collapsed.value = next;
      if (!next && exclusiveCompact && overlayActive()) {
        for (const other of panels)
          if (other !== panel) other.collapsed.value = true;
      }
    }),
  );

  // Focus: move into the panel when it opens; restore to the trigger when it closes.
  for (const panel of panels) {
    let previous = panel.collapsed.value;
    disposers.push(
      effect(() => {
        const collapsed = panel.collapsed.value;
        if (collapsed === previous) return;
        previous = collapsed;
        const element = panelElement(panel.id);
        if (adapting.delete(panel)) {
          // A presentation change, not a user action: only rescue focus that
          // the collapse would strand inside the now-hidden panel.
          const trigger = returnFocus.get(panel.id);
          if (
            collapsed &&
            element?.contains(ownerDocument.activeElement) &&
            trigger?.isConnected &&
            !element.contains(trigger)
          )
            trigger.focus();
          return;
        }
        const replaced =
          deviceClass?.value.compact && compactPresentation === 'hidden';
        if (!collapsed && element && !replaced) {
          (focusables(element)[0] ?? element).focus();
        } else if (collapsed) {
          returnFocus.get(panel.id)?.focus();
        }
      }),
    );
  }

  // Compact overlay: a dismissable backdrop + Escape + focus trap while compact
  // and a panel is open.
  if (deviceClass) {
    let backdrop: HTMLButtonElement | undefined;
    const openPanel = (): WireSidebarPanel | undefined =>
      panels.find((panel) => !panel.collapsed.value);
    const removeBackdrop = (): void => {
      backdrop?.remove();
      backdrop = undefined;
    };
    disposers.push(
      effect(() => {
        const compact = deviceClass.value.compact;
        const overlay = compact && compactPresentation === 'overlay';
        // A crossing adapts the panels here, in the same effect that owns the
        // host attributes. Every panel's state is read BEFORE that write, so
        // the write re-runs this effect after the app's own re-render: a host
        // the app renders (and morphs) still ends up marked.
        for (const panel of panels) void panel.collapsed.value;
        if (overlay && !inlineState) {
          inlineState = new Map(
            panels.map((panel) => [panel, panel.collapsed.peek()]),
          );
          setAll(() => true);
        } else if (!overlay) {
          restoreInline();
        }
        const open = overlay
          ? panels.find((panel) => !panel.collapsed.peek())
          : undefined;
        root.dataset.collapsibleResponsive = compact
          ? compactPresentation
          : 'inline';
        root.dataset.collapsibleOverlay = String(overlay);
        if (overlay && open) {
          if (!backdrop) {
            backdrop = ownerDocument.createElement('button');
            backdrop.type = 'button';
            backdrop.className = 'kui-collapsible-panel__backdrop';
            backdrop.setAttribute('aria-label', 'Close');
            backdrop.addEventListener('click', () => {
              const current = openPanel();
              if (current) collapse(current);
            });
            const element = panelElement(open.id);
            element?.parentElement?.insertBefore(backdrop, element);
          }
        } else {
          removeBackdrop();
          if (!compact) delete root.dataset.collapsibleOverlay;
        }
      }),
    );

    const onKeydown = (event: KeyboardEvent): void => {
      if (!deviceClass.value.compact || compactPresentation !== 'overlay')
        return;
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
    disposers.push(() =>
      ownerDocument.removeEventListener('keydown', onKeydown),
    );
    disposers.push(removeBackdrop);
  }

  return () => {
    for (const dispose of disposers.splice(0)) dispose();
    // After every effect is gone, so handing the inline state back cannot
    // re-create overlay chrome or persist anything.
    restoreInline();
    delete root.dataset.collapsibleOverlay;
    delete root.dataset.collapsibleResponsive;
  };
}
