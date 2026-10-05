interface NamedDialog extends HTMLElement {
  dialog?: HTMLDialogElement;
  label: string;
  withoutHeader: boolean;
  update(changed: unknown): void;
}

const installed = new WeakSet<object>();
const observed = new WeakSet<HTMLElement>();
const ownedNames = new WeakMap<
  HTMLElement,
  { attribute: string; value: string }
>();

/** Repair Web Awesome's missing native dialog name before its first modal open. */
export function installDialogLabel(prototype: object): void {
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const target = prototype as NamedDialog;
  const update = target.update;
  target.update = function (this: NamedDialog, changed: unknown): void {
    update.call(this, changed);
    if (!this.parentElement?.classList.contains('kui-dialog-surface')) return;
    if (!observed.has(this)) {
      observed.add(this);
      new MutationObserver(() => syncDialogLabel(this)).observe(this, {
        attributes: true,
        attributeFilter: ['aria-label'],
      });
    }
    syncDialogLabel(this);
  };
}

function syncDialogLabel(host: NamedDialog): void {
  if (!host.parentElement?.classList.contains('kui-dialog-surface')) return;
  const panel = host.dialog;
  if (!panel) return;
  const previous = ownedNames.get(panel);
  const externalName = ['aria-label', 'aria-labelledby'].some((attribute) => {
    const value = panel.getAttribute(attribute);
    return (
      value !== null &&
      !(previous?.attribute === attribute && previous.value === value)
    );
  });
  if (externalName) {
    if (previous && panel.getAttribute(previous.attribute) === previous.value)
      panel.removeAttribute(previous.attribute);
    ownedNames.delete(panel);
    return;
  }
  const explicit = host.getAttribute('aria-label')?.trim();
  const title = host.shadowRoot?.getElementById('title');
  const attribute =
    !explicit && !host.withoutHeader && title
      ? 'aria-labelledby'
      : 'aria-label';
  const value =
    attribute === 'aria-labelledby' ? 'title' : explicit || host.label;
  if (previous && previous.attribute !== attribute)
    panel.removeAttribute(previous.attribute);
  if (panel.getAttribute(attribute) !== value)
    panel.setAttribute(attribute, value);
  ownedNames.set(panel, { attribute, value });
}
