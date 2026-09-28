// The transient-overlay behavior `wireWorkbench` gives Workbench panels that
// present as overlays: a responsive overlay starts collapsed when its
// breakpoint begins to apply, an open overlay takes focus and keeps Tab inside
// it, and it closes on Escape or a press outside it. It mirrors `wireSidebar`'s
// compact overlay (the ARIA dialog pattern). Internal.

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
  'a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * The panel's focusable controls, in tab order. Only an open panel is ever
 * asked. The selector drops disabled controls and `tabindex="-1"`; a
 * rendered control the CSS hides (the separator of a panel whose responsive
 * overlay breakpoint applies is `display: none`) is dropped too, or Tab would
 * wrap from a control focus can never reach. Where `checkVisibility` is
 * missing, every matched control counts.
 */
const focusables = (element: HTMLElement): HTMLElement[] =>
  [...element.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (control) =>
      typeof control.checkVisibility !== 'function' ||
      control.checkVisibility(),
  );

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
 * - A panel that opens while it presents as an overlay takes focus: its
 *   first focusable control (else the panel itself) is focused, without
 *   scrolling its sliding content. While an overlay is open, Tab and
 *   Shift+Tab cycle through the controls of the overlay that holds focus
 *   (else the most recently opened one) and never reach the work area it
 *   covers — the ARIA dialog pattern `wireSidebar`'s compact overlay follows.
 *   Inline panels are left alone.
 * - Escape closes the open overlay panel that holds focus, else the most
 *   recently opened one; a press that starts and ends outside an open overlay
 *   panel closes it. Static `presentation: "overlay"` panels are included.
 * - Focus stranded in a panel that closes — however it closed, including
 *   through the app's own control inside it — returns to the control that
 *   had it when the panel opened, else to the panel's restore control, else
 *   to a control outside it whose `aria-controls` names the panel (or an
 *   element inside it). The last covers a panel that was already open at
 *   wire-up, which has no recorded opener. Focus a press inside the panel
 *   dropped to the body counts as stranded too: Safari and macOS WebKit
 *   never focus a clicked button, so pressing the panel's own close control
 *   blurs the focused control before the click closes the panel. Focus the
 *   user has since moved to any element is left where it is.
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
  // The open panel the latest press started in while focus was inside it,
  // until focus next lands anywhere. Safari and macOS WebKit never focus a
  // clicked button, so pressing a panel's own close control blurs the focused
  // control to the body before the click closes the panel; this is how the
  // close still counts as leaving focus stranded in it.
  let pressedFocus: WorkbenchOverlayPanel | undefined;
  /**
   * The `aria-controls` control a click just activated, kept for a couple of
   * frames: the toggle a panel opens or closes from, even once the app's
   * render has removed it.
   */
  let activated: HTMLElement | undefined;

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
    // An opener inside another panel that has closed since (an exclusive
    // overlay closes the one it was opened from) would strand focus there too.
    if (
      opener?.isConnected &&
      !element?.contains(opener) &&
      !panels.some(
        (other) =>
          other.collapsed.peek() && panelElement(other)?.contains(opener),
      )
    )
      return opener;
    const side = RESTORE_PANELS[panel.key];
    const restore = findWorkbench()
      ?.querySelector<HTMLElement>(
        `.kui-workbench__restore[data-panel="${side}"]`,
      )
      ?.querySelector<HTMLElement>(FOCUSABLE);
    return restore ?? (element ? controller(element) : undefined);
  };
  /**
   * A control outside the panel that names it, or an element inside it, in
   * its `aria-controls`: the app's toggle for a panel with no opener.
   */
  const controller = (element: HTMLElement): HTMLElement | undefined => {
    const ids = new Set(
      [element, ...element.querySelectorAll('[id]')].map((node) => node.id),
    );
    ids.delete('');
    return [
      ...ownerDocument.querySelectorAll<HTMLElement>('[aria-controls]'),
    ].find(
      (control) =>
        !element.contains(control) &&
        control.matches(FOCUSABLE) &&
        control
          .getAttribute('aria-controls')!
          .split(/\s+/)
          .some((id) => ids.has(id)),
    );
  };
  /** Whether a control's `aria-controls` (always present) names panel `id`. */
  const namesPanel = (control: Element, id: string): boolean =>
    control.getAttribute('aria-controls')!.split(/\s+/).includes(id);
  /** The panel's own control for itself: its toggle inside it. */
  const controlInside = (element: HTMLElement): HTMLElement | undefined =>
    [...element.querySelectorAll<HTMLElement>('[aria-controls]')].find(
      (control) =>
        control.matches(FOCUSABLE) && namesPanel(control, element.id),
    );
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
  // The breakpoints are in rem, so a root font-size change (a text-size
  // setting applied after load) moves a panel across them without resizing
  // the Workbench. A 1rem probe outside the app's tree reports that change.
  const remProbe = ownerDocument.createElement('div');
  remProbe.setAttribute('aria-hidden', 'true');
  remProbe.style.cssText =
    'position:absolute;width:1rem;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
  if (resizeObserver) {
    ownerDocument.body.append(remProbe);
    resizeObserver.observe(remProbe);
  }
  disposers.push(() => {
    mutationObserver.disconnect();
    resizeObserver?.disconnect();
    remProbe.remove();
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
          // it would be stranded in a hidden panel. So would focus that a
          // press inside it dropped to the body (see `pressedFocus`).
          const active = ownerDocument.activeElement;
          const element = panelElement(panel);
          if (
            element?.contains(active) ||
            // The panel's own control closed it (focused or not), so hand
            // focus to the control that reopens it.
            (activated !== undefined && element?.contains(activated)) ||
            (pressedFocus === panel &&
              (active === null || active === ownerDocument.body))
          )
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
        // A focused toggle the app's render removes as the panel opens — a
        // Workbench toolbar toggle leaves the work-area toolbar for the
        // panel's own — would drop focus to the body. Hand it to the panel's
        // own control for it, so a keyboard user keeps their place. The
        // render may land before this effect (the toggle is gone already, so
        // the activated control stands in for the opener) or after it, in a
        // microtask or a later frame.
        const toggle =
          openers.get(panel) ??
          (activated && element && namesPanel(activated, element.id)
            ? activated
            : undefined);
        if (toggle) {
          const handOff = (frames: number): void => {
            const focused = ownerDocument.activeElement;
            if (panel.collapsed.peek()) return;
            if (toggle.isConnected) {
              if (toggle === focused && frames > 0)
                globalThis.requestAnimationFrame(() => handOff(frames - 1));
              return;
            }
            if (focused !== null && focused !== ownerDocument.body) return;
            const current = panelElement(panel);
            if (current) controlInside(current)?.focus({ preventScroll: true });
          };
          globalThis.queueMicrotask(() => handOff(5));
        }
        if (!element || !overlaid(element)) return;
        // Opening an overlay closes the others. Their collapse effects run
        // after this one, by which time focus has moved into this panel, so
        // none of them hands it back to an opener.
        if (exclusive)
          for (const [other] of openOverlays())
            if (other !== panel) other.collapsed.value = true;
        // An overlay covers the work area, so focus moves in with it rather
        // than staying on a control it may cover. Without preventScroll the
        // browser scrolls the panel's clipped, still-sliding content to reveal
        // the target, which then unwinds as the slide finishes.
        (focusables(element)[0] ?? element).focus({ preventScroll: true });
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
    if (
      (event.key !== 'Escape' && event.key !== 'Tab') ||
      event.defaultPrevented
    )
      return;
    const open = openOverlays();
    if (open.length === 0) return;
    const active = ownerDocument.activeElement;
    const [panel, element] =
      open.find(([, candidate]) => candidate.contains(active)) ??
      open[open.length - 1]!;
    if (event.key === 'Escape') {
      event.preventDefault();
      // The collapse effect returns focus stranded inside it.
      panel.collapsed.value = true;
      return;
    }
    // Tab stays inside the open overlay: it wraps at either end, and focus
    // that is somewhere else (the app moved it, or the panel had no control
    // to take it when it opened) comes back in.
    const items = focusables(element);
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const inside = element.contains(active);
    if (event.shiftKey && (!inside || active === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (!inside || active === last)) {
      event.preventDefault();
      first.focus();
    }
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
    // Before the press's default action moves focus: the open panel it
    // started in, when focus was inside that panel too.
    const active = ownerDocument.activeElement;
    pressedFocus = panels.find((panel) => {
      if (panel.collapsed.peek()) return false;
      const element = panelElement(panel);
      return !!element && path.includes(element) && element.contains(active);
    });
  };
  // Focus landing anywhere is a deliberate move the rescue must not undo.
  const onFocusin = (): void => {
    pressedFocus = undefined;
  };
  const onClick = (event: MouseEvent): void => {
    const candidates = pressed;
    pressed = [];
    const path = event.composedPath();
    for (const [panel, element] of openOverlays())
      if (candidates.includes(panel) && !path.includes(element))
        panel.collapsed.value = true;
  };
  const onActivate = (event: MouseEvent): void => {
    const target = event.target;
    const control =
      target instanceof Element
        ? target.closest<HTMLElement>('[aria-controls]')
        : null;
    // Recorded whether or not it took focus: Safari and macOS WebKit never
    // focus a clicked button.
    if (!control) return;
    activated = control;
    // The collapse effect may run after the click's dispatch (the app can
    // batch its write), so keep the control for a couple of frames.
    globalThis.requestAnimationFrame(() =>
      globalThis.requestAnimationFrame(() => {
        if (activated === control) activated = undefined;
      }),
    );
  };
  ownerDocument.addEventListener('keydown', onKeydown);
  ownerDocument.addEventListener('pointerdown', onPointerdown, true);
  ownerDocument.addEventListener('click', onActivate, true);
  ownerDocument.addEventListener('click', onClick);
  ownerDocument.addEventListener('focusin', onFocusin, true);
  disposers.push(() => {
    ownerDocument.removeEventListener('keydown', onKeydown);
    ownerDocument.removeEventListener('pointerdown', onPointerdown, true);
    ownerDocument.removeEventListener('click', onActivate, true);
    ownerDocument.removeEventListener('click', onClick);
    ownerDocument.removeEventListener('focusin', onFocusin, true);
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
