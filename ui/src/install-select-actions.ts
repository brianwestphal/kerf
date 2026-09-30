type SelectAction = 'all' | 'clear';

interface SelectActionOption extends HTMLElement {
  disabled: boolean;
}

interface SelectActionHost extends HTMLElement {
  multiple: boolean;
  disabled: boolean;
  hasInteracted: boolean;
  valueHasChanged: boolean;
  selectedOptions: SelectActionOption[];
  updateComplete: Promise<unknown>;
  getAllOptions(): SelectActionOption[];
  setSelectedOptions(options: SelectActionOption[]): void;
}

/** Apply one footer action through Web Awesome's ordinary selection path. */
export function runSelectAction(
  host: SelectActionHost,
  action: SelectAction,
): boolean {
  if (host.disabled || !host.multiple) return false;
  const enabled = host.getAllOptions().filter((option) => !option.disabled);
  const next = action === 'all' ? enabled : [];
  const current = host.selectedOptions;
  if (
    current.length === next.length &&
    current.every((option) => next.includes(option))
  )
    return false;
  host.hasInteracted = true;
  host.valueHasChanged = true;
  host.setSelectedOptions(next);
  void host.updateComplete.then(() => {
    host.dispatchEvent(
      new InputEvent('input', { bubbles: true, composed: true }),
    );
    host.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  });
  return true;
}

const installedDocuments = new WeakSet<Document>();

/** Wire opt-in multiple-select footer buttons at the registration boundary. */
export function installSelectActions(doc: Document = document): void {
  if (installedDocuments.has(doc)) return;
  installedDocuments.add(doc);
  // Web Awesome listens for keydown on document while the popup is open. Its
  // option shortcuts would otherwise consume Enter/Space from these native
  // footer buttons before the browser can activate them.
  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'Tab') return;
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button[data-select-action]');
    if (button?.closest('wa-select[data-component="select"]'))
      event.stopImmediatePropagation();
  });
  doc.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLElement>(
      'button[data-select-action]',
    );
    if (!button || button.hasAttribute('disabled')) return;
    const host = button.closest<SelectActionHost>(
      'wa-select[data-component="select"]',
    );
    if (!host) return;
    const action = button.dataset.selectAction;
    if (action === 'all' || action === 'clear') runSelectAction(host, action);
  });
}
