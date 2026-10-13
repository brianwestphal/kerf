interface ChromeDialog extends HTMLElement {
  dialog?: HTMLDialogElement;
  update(changed: unknown): void;
}

/**
 * The panel variable a floating header's divider reads: set while content
 * is scrolled away beneath the header, unset (no divider) otherwise.
 */
export const HEADER_DIVIDER_PROPERTY = '--_kui-dialog-surface-header-divider';

/** The value published while the divider shows: the color the CSS owns. */
const SHOWN = 'var(--_kui-dialog-surface-header-divider-color)';

/**
 * Scroll distance, in px, that counts as "away from the top": a scroller at
 * rest can report a fractional offset.
 */
const THRESHOLD = 1;

const installed = new WeakSet<object>();
const wiredPanels = new WeakSet<Element>();

/**
 * Draw a floating DialogSurface header's divider while content is scrolled
 * beneath it, the way a Pane's overlay header does. Capture-phase `scroll`
 * listeners on the shadow panel and the host see both the body part (flowing
 * content) and a slotted filling child that reaches beneath the header (a
 * transcript `List` or `Pane` with block-start `scrollClearance`); a nested
 * scroller that starts below the header never counts. The state is published
 * on the panel, where Kerf rerenders never reach.
 */
export function installHeaderScrollDivider(prototype: object): void {
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const target = prototype as ChromeDialog;
  const update = target.update;
  target.update = function (this: ChromeDialog, changed: unknown): void {
    update.call(this, changed);
    if (!this.parentElement?.classList.contains('kui-dialog-surface')) return;
    const panel = this.dialog;
    if (panel && !wiredPanels.has(panel)) wire(this, panel);
  };
}

function wire(host: ChromeDialog, panel: HTMLElement): void {
  wiredPanels.add(panel);
  const scrolled = new Set<Element>();
  const onScroll = (event: Event): void => {
    const scroller = event.target;
    if (!(scroller instanceof Element)) return;
    const header = host.shadowRoot?.querySelector('[part~="header"]');
    const floating =
      host.parentElement?.getAttribute('data-header-presentation') ===
      'floating';
    if (
      floating &&
      header &&
      scroller.scrollTop > THRESHOLD &&
      // Only a scroller that reaches beneath the header.
      scroller.getBoundingClientRect().top <=
        header.getBoundingClientRect().bottom
    )
      scrolled.add(scroller);
    else scrolled.delete(scroller);
    for (const element of scrolled)
      if (!element.isConnected) scrolled.delete(element);
    const value = scrolled.size > 0 ? SHOWN : '';
    if (panel.style.getPropertyValue(HEADER_DIVIDER_PROPERTY) === value) return;
    if (value) panel.style.setProperty(HEADER_DIVIDER_PROPERTY, value);
    else panel.style.removeProperty(HEADER_DIVIDER_PROPERTY);
  };
  // `scroll` does not bubble or leave a shadow root: the panel's capture
  // listener sees the body part, the host's sees slotted scrollers.
  for (const root of [panel, host])
    root.addEventListener('scroll', onScroll, { capture: true, passive: true });
}
