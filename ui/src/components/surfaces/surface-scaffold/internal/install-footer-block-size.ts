interface FooterDialog extends HTMLElement {
  dialog?: HTMLDialogElement;
  update(changed: unknown): void;
}

/** The panel variable a floating footer's body clearance reads. */
export const FOOTER_BLOCK_SIZE_PROPERTY =
  '--_kui-dialog-surface-footer-block-size';

const installed = new WeakSet<object>();
const observedFooters = new WeakSet<Element>();

/**
 * Publish a DialogSurface footer's measured block size on its shadow panel,
 * where Kerf rerenders never reach, so a floating footer's body clearance
 * follows the footer as its content grows, wraps, or hides.
 */
export function installFooterBlockSize(prototype: object): void {
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const target = prototype as FooterDialog;
  const update = target.update;
  target.update = function (this: FooterDialog, changed: unknown): void {
    update.call(this, changed);
    if (!this.parentElement?.classList.contains('kui-dialog-surface')) return;
    observeFooter(this);
  };
}

function observeFooter(host: FooterDialog): void {
  const panel = host.dialog;
  const footer = host.shadowRoot?.querySelector('[part~="footer"]');
  if (!panel || !footer || observedFooters.has(footer)) return;
  observedFooters.add(footer);
  const publish = (blockSize: number): void => {
    const value = `${blockSize}px`;
    if (panel.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY) !== value)
      panel.style.setProperty(FOOTER_BLOCK_SIZE_PROPERTY, value);
  };
  publish(footer.getBoundingClientRect().height);
  if (typeof ResizeObserver === 'undefined') return;
  new ResizeObserver((entries) => {
    const box = entries[entries.length - 1]?.borderBoxSize?.[0];
    publish(box ? box.blockSize : footer.getBoundingClientRect().height);
  }).observe(footer);
}
