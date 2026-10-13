interface ChromeDialog extends HTMLElement {
  dialog?: HTMLDialogElement;
  update(changed: unknown): void;
}

/** The panel variable a floating header's body clearance reads. */
export const HEADER_BLOCK_SIZE_PROPERTY =
  '--_kui-dialog-surface-header-block-size';

/** The panel variable a floating footer's body clearance reads. */
export const FOOTER_BLOCK_SIZE_PROPERTY =
  '--_kui-dialog-surface-footer-block-size';

/** Each measured dialog part, with the panel variable it publishes. */
const CHROME_PARTS = [
  ['header', HEADER_BLOCK_SIZE_PROPERTY],
  ['footer', FOOTER_BLOCK_SIZE_PROPERTY],
] as const;

const installed = new WeakSet<object>();
const observedParts = new WeakSet<Element>();

/**
 * Publish a DialogSurface's header and footer block sizes on its shadow
 * panel, where Kerf rerenders never reach, so a floating header's or footer's
 * body clearance follows that chrome as its content grows, wraps, or hides.
 */
export function installChromeBlockSize(prototype: object): void {
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const target = prototype as ChromeDialog;
  const update = target.update;
  target.update = function (this: ChromeDialog, changed: unknown): void {
    update.call(this, changed);
    if (!this.parentElement?.classList.contains('kui-dialog-surface')) return;
    const panel = this.dialog;
    if (!panel) return;
    for (const [part, property] of CHROME_PARTS) {
      const element = this.shadowRoot?.querySelector(`[part~="${part}"]`);
      // Web Awesome drops the header part under `without-header`; with no
      // part to clear, the floating clearance falls back to zero.
      if (element) observePart(panel, element, property);
      else panel.style.removeProperty(property);
    }
  };
}

function observePart(
  panel: HTMLElement,
  element: Element,
  property: string,
): void {
  if (observedParts.has(element)) return;
  observedParts.add(element);
  const publish = (blockSize: number): void => {
    const value = `${blockSize}px`;
    if (panel.style.getPropertyValue(property) !== value)
      panel.style.setProperty(property, value);
  };
  publish(element.getBoundingClientRect().height);
  if (typeof ResizeObserver === 'undefined') return;
  new ResizeObserver((entries) => {
    // A part Web Awesome has since removed no longer owns the variable.
    if (!element.isConnected) return;
    const box = entries[entries.length - 1]?.borderBoxSize?.[0];
    publish(box ? box.blockSize : element.getBoundingClientRect().height);
  }).observe(element);
}
