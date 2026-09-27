// The transient-overlay behavior `wireWorkbench` gives Workbench panels that
// present as overlays: a responsive overlay starts collapsed when its
// breakpoint begins to apply, and an open overlay closes on Escape or a press
// outside it. It mirrors `wireSidebar`'s compact overlay. Internal.

import { effect, type Signal } from 'kerfjs';

import type { WorkbenchPanelKey } from './workbench-resize.js';

/** A Workbench panel whose app-owned `collapsed` signal the wiring may write. */
export interface WorkbenchOverlayPanel {
  key: WorkbenchPanelKey;
  collapsed: Signal<boolean>;
}

/** Each panel's own element, never a nested Workbench's. */
const PANEL_SELECTORS: Record<WorkbenchPanelKey, string> = {
  leftRail: ':scope > [data-workbench-rail="left"]',
  rightRail: ':scope > [data-workbench-rail="right"]',
  bottomDrawer: ':scope > .kui-workbench__center > [data-workbench-drawer]',
};

const RESTORE_PANELS: Record<WorkbenchPanelKey, string> = {
  leftRail: 'left',
  rightRail: 'right',
  bottomDrawer: 'bottom',
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Wire transient overlay behavior for the given panels of the Workbench that
 * `findWorkbench` returns (looked up on use, so the Workbench may render after
 * wire-up). The app still owns each `collapsed` signal; this wiring only
 * writes it:
 *
 * - When a panel's `responsiveOverlayAt` breakpoint begins to apply (at
 *   wire-up, on first render, or on a crossing), its inline collapsed state is
 *   remembered and the panel collapses, so no overlay covers the work area
 *   until the user opens it. When the breakpoint stops applying (or on
 *   disposal) the remembered state comes back. These presentation changes
 *   skip the collapse motion.
 * - Escape closes the open overlay panel that holds focus, else the most
 *   recently opened one; a press that starts and ends outside an open overlay
 *   panel closes it. Static `presentation: "overlay"` panels are included.
 * - Focus stranded in a panel that closes — however it closed, including
 *   through the app's own control inside it — returns to the control that
 *   had it when the panel opened, else to the panel's restore control.
 * - With `exclusive`, a panel that opens while it presents as an overlay
 *   closes every other open overlay panel, so overlays never cover each
 *   other's controls. Inline panels are never closed by it.
 *
 * Returns a disposer.
 */
export function wireWorkbenchOverlays(
  root: HTMLElement,
  findWorkbench: () => HTMLElement | null,
  panels: readonly WorkbenchOverlayPanel[],
  exclusive = false,
): () => void {
  const ownerDocument = root.ownerDocument;
  const disposers: Array<() => void> = [];
  // Open panels, most recently opened last, and each one's opener: the
  // control that had focus when it opened.
  const openOrder: WorkbenchOverlayPanel[] = [];
  const openers = new Map<WorkbenchOverlayPanel, HTMLElement>();

  const panelElement = (panel: WorkbenchOverlayPanel): HTMLElement | null =>
    findWorkbench()?.querySelector<HTMLElement>(PANEL_SELECTORS[panel.key]) ??
    null;
  /** Whether the panel's responsive overlay breakpoint currently applies. */
  const responsive = (element: HTMLElement): boolean =>
    element.dataset.presentation === 'inline' &&
    element.hasAttribute('data-responsive-overlay-at') &&
    globalThis.getComputedStyle(element).position === 'absolute';
  const overlaid = (element: HTMLElement): boolean =>
    element.dataset.presentation === 'overlay' || responsive(element);

  /** Where focus goes when a panel it was in closes. */
  const restoreTarget = (
    panel: WorkbenchOverlayPanel,
    element: HTMLElement | null,
  ): HTMLElement | undefined => {
    const opener = openers.get(panel);
    if (opener?.isConnected && !element?.contains(opener)) return opener;
    const side = RESTORE_PANELS[panel.key];
    const restore = findWorkbench()?.querySelector<HTMLElement>(
      `.kui-workbench__restore[data-panel="${side}"]`,
    );
    return restore?.querySelector<HTMLElement>(FOCUSABLE) ?? undefined;
  };
  const rescueFocus = (panel: WorkbenchOverlayPanel): void => {
    const element = panelElement(panel);
    const target = restoreTarget(panel, element);
    if (target) {
      target.focus();
      return;
    }
    // An app that renders its restore control after this write has not
    // produced it yet; look again once the current batch settles.
    globalThis.queueMicrotask(() => {
      if (!panel.collapsed.peek()) return;
      const later = restoreTarget(panel, panelElement(panel));
      const active = ownerDocument.activeElement;
      if (later) later.focus();
      else if (active instanceof HTMLElement && element?.contains(active))
        active.blur();
    });
  };

  /**
   * A presentation-driven write: no collapse motion, because nothing the user
   * did moved the panel. The app's render has normally applied the new state
   * by the time the write returns, so the content's transition is suspended
   * across one style flush.
   */
  const adapt = (
    panel: WorkbenchOverlayPanel,
    element: HTMLElement,
    collapsed: boolean,
  ): void => {
    if (panel.collapsed.peek() === collapsed) return;
    const stranded = collapsed && element.contains(ownerDocument.activeElement);
    panel.collapsed.value = collapsed;
    // Every Workbench panel renders its content wrapper, and never with a
    // style of its own, so the attribute goes again once the flush is done.
    const content = element.querySelector<HTMLElement>(
      ':scope > .kui-workbench__panel-content',
    )!;
    content.style.transition = 'none';
    void globalThis.getComputedStyle(content).transform;
    content.removeAttribute('style');
    // The collapse effect has normally returned the focus already; on
    // disposal, after the effects are gone, this is what returns it.
    if (stranded && element.contains(ownerDocument.activeElement))
      rescueFocus(panel);
  };

  // The inline collapsed state of each panel whose responsive overlay
  // currently applies, restored when it stops applying.
  const inlineState = new Map<WorkbenchOverlayPanel, boolean>();
  const sync = (): void => {
    for (const panel of panels) {
      const element = panelElement(panel);
      if (!element) continue;
      const active = responsive(element);
      if (active && !inlineState.has(panel)) {
        inlineState.set(panel, panel.collapsed.peek());
        adapt(panel, element, true);
      } else if (!active && inlineState.has(panel)) {
        const remembered = inlineState.get(panel)!;
        inlineState.delete(panel);
        adapt(panel, element, remembered);
      }
    }
  };

  // The Workbench is its own breakpoint container, so its size is what moves a
  // panel across the breakpoint. It may render after wire-up or be replaced,
  // and the app may change a presentation, so both are observed too.
  let observed: HTMLElement | null = null;
  const resizeObserver =
    typeof globalThis.ResizeObserver === 'function'
      ? new globalThis.ResizeObserver(() => sync())
      : undefined;
  /** Observe the current Workbench; whether it changed. */
  const track = (): boolean => {
    const workbench = findWorkbench();
    if (workbench === observed) return false;
    if (observed) resizeObserver?.unobserve(observed);
    observed = workbench;
    if (workbench) resizeObserver?.observe(workbench);
    return true;
  };
  const mutationObserver = new MutationObserver((records) => {
    if (track() || records.some((record) => record.type === 'attributes'))
      sync();
  });
  mutationObserver.observe(root, {
    attributes: true,
    attributeFilter: ['data-presentation', 'data-responsive-overlay-at'],
    childList: true,
    subtree: true,
  });
  disposers.push(() => {
    mutationObserver.disconnect();
    resizeObserver?.disconnect();
  });
  track();
  sync();

  for (const panel of panels) {
    let previous = panel.collapsed.peek();
    if (!previous) openOrder.push(panel);
    disposers.push(
      effect(() => {
        const collapsed = panel.collapsed.value;
        if (collapsed === previous) return;
        previous = collapsed;
        const index = openOrder.indexOf(panel);
        if (index >= 0) openOrder.splice(index, 1);
        if (collapsed) {
          // Whatever closed the panel — Escape, an outside press, a
          // breakpoint, or the app's own control inside it — focus left in
          // it would be stranded in a hidden panel.
          if (panelElement(panel)?.contains(ownerDocument.activeElement))
            rescueFocus(panel);
          return;
        }
        openOrder.push(panel);
        const element = panelElement(panel);
        const active = ownerDocument.activeElement;
        if (
          active instanceof HTMLElement &&
          active !== ownerDocument.body &&
          !element?.contains(active)
        )
          openers.set(panel, active);
        else openers.delete(panel);
        // Opening an overlay closes the others, whose collapse effects then
        // return any focus left in them.
        if (exclusive && element && overlaid(element))
          for (const [other] of openOverlays())
            if (other !== panel) other.collapsed.value = true;
      }),
    );
  }

  /** The open overlay panels with their elements, most recent last. */
  const openOverlays = (): Array<[WorkbenchOverlayPanel, HTMLElement]> =>
    openOrder.flatMap((panel): Array<[WorkbenchOverlayPanel, HTMLElement]> => {
      const element = panelElement(panel);
      return !panel.collapsed.peek() && element && overlaid(element)
        ? [[panel, element]]
        : [];
    });

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    const open = openOverlays();
    if (open.length === 0) return;
    const active = ownerDocument.activeElement;
    const target =
      open.find(([, element]) => element.contains(active)) ??
      open[open.length - 1]!;
    event.preventDefault();
    // The collapse effect returns focus stranded inside it.
    target[0].collapsed.value = true;
  };

  // An outside press closes an open overlay when it both starts and ends
  // outside it. Deciding at the click lets an app toggle that closes the panel
  // run first, and a press that opens a panel never closes it.
  let pressed: WorkbenchOverlayPanel[] = [];
  const onPointerdown = (event: PointerEvent): void => {
    const path = event.composedPath();
    pressed = openOverlays()
      .filter(([, element]) => !path.includes(element))
      .map(([panel]) => panel);
  };
  const onClick = (event: MouseEvent): void => {
    const candidates = pressed;
    pressed = [];
    const path = event.composedPath();
    for (const [panel, element] of openOverlays())
      if (candidates.includes(panel) && !path.includes(element))
        panel.collapsed.value = true;
  };
  ownerDocument.addEventListener('keydown', onKeydown);
  ownerDocument.addEventListener('pointerdown', onPointerdown, true);
  ownerDocument.addEventListener('click', onClick);
  disposers.push(() => {
    ownerDocument.removeEventListener('keydown', onKeydown);
    ownerDocument.removeEventListener('pointerdown', onPointerdown, true);
    ownerDocument.removeEventListener('click', onClick);
  });

  return () => {
    for (const dispose of disposers.splice(0)) dispose();
    // After every observer and effect is gone, so handing the inline state
    // back cannot re-enter the wiring.
    for (const [panel, remembered] of inlineState) {
      const element = panelElement(panel);
      if (element) adapt(panel, element, remembered);
      else panel.collapsed.value = remembered;
    }
    inlineState.clear();
  };
}
