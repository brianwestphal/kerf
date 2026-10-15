import { summarizeSelection } from '../model/select-summary.js';

const OPTION = '.kui-select__option';

const isDisabled = (option: Element): boolean =>
  option.getAttribute('aria-disabled') === 'true';

/** An option's value. */
export const optionValue = (option: Element): string =>
  option.getAttribute('data-value')!;

const optionLabel = (option: Element): string =>
  option.querySelector('.kui-select__option-label')!.textContent;

/** Every option of a Select, in choice order. */
export function optionsOf(root: Element): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(OPTION));
}

/** The chosen (enabled, `aria-selected`) options of a Select. */
export function chosenOptions(root: Element): HTMLElement[] {
  return optionsOf(root).filter(
    (option) =>
      option.getAttribute('aria-selected') === 'true' && !isDisabled(option),
  );
}

/**
 * Bring the closed trigger in line with the options' selection: the value
 * text (a single choice's label, a multiple Select's summary), a single
 * choice's icon, and an icon-only multiple trigger's name. A custom selected
 * rendering and a count badge are the application's to re-render.
 */
export function renderSelection(root: Element): void {
  const trigger = root.querySelector<HTMLElement>(
    ':scope > .kui-select__trigger',
  )!;
  const valueText = trigger.querySelector<HTMLElement>('.kui-select__value')!;
  const chosen = chosenOptions(root);
  const multiple = root.hasAttribute('multiple');
  const iconOnly =
    root.getAttribute('data-selected-presentation') === 'icon-only';
  const summary = multiple ? summarizeSelection(chosen.map(optionLabel)) : '';
  const text = multiple
    ? iconOnly
      ? ''
      : summary
    : chosen[0]
      ? optionLabel(chosen[0])
      : '';
  if (multiple && iconOnly) {
    const base = root
      .querySelector('.kui-select__listbox')!
      .getAttribute('aria-label')!;
    trigger.setAttribute('aria-label', summary ? `${base}: ${summary}` : base);
  }
  if (root.classList.contains('kui-select--custom-selected')) return;
  if (text) {
    valueText.textContent = text;
    valueText.removeAttribute('data-placeholder');
  } else {
    // An empty Select shows its placeholder text, if it has one.
    valueText.textContent = valueText.getAttribute('data-placeholder-text');
    valueText.setAttribute('data-placeholder', 'true');
  }
  if (multiple) return;
  // A single choice leads with its icon; another choice without one drops it.
  trigger.querySelector(':scope > .kui-select__icon--selected')?.remove();
  const icon = chosen[0]?.querySelector('.kui-select__icon');
  if (icon) {
    const copy = icon.cloneNode(true) as HTMLElement;
    copy.classList.add('kui-select__icon--selected');
    trigger.prepend(copy);
  }
}

/**
 * Choose options: replace a single Select's choice, or set a multiple
 * Select's. Disabled options never become chosen. Returns whether anything
 * changed.
 */
export function setChosen(root: Element, values: readonly string[]): boolean {
  const wanted = new Set(values);
  const multiple = root.hasAttribute('multiple');
  let changed = false;
  let found = false;
  for (const option of optionsOf(root)) {
    const next =
      !isDisabled(option) &&
      wanted.has(optionValue(option)) &&
      (multiple || !found);
    if (next) found = true;
    if ((option.getAttribute('aria-selected') === 'true') !== next) {
      option.setAttribute('aria-selected', String(next));
      changed = true;
    }
  }
  if (changed) renderSelection(root);
  return changed;
}

interface FormInternals {
  setFormValue(value: string | FormData | null): void;
  readonly form: HTMLFormElement | null;
}

/**
 * The Select root, `kui-select`: a light-DOM, form-associated control. Its
 * `value` is the chosen value (a string), or the chosen values in choice
 * order (an array) with `multiple`; it submits under `name` like a native
 * select and returns to its rendered value on form reset.
 */
export class KuiSelectElement extends HTMLElement {
  static formAssociated = true;

  #internals: FormInternals | undefined;
  #observer: MutationObserver | undefined;

  constructor() {
    super();
    // Engines without form-associated custom elements still get a working
    // control; it just does not join a form.
    this.#internals =
      typeof this.attachInternals === 'function'
        ? (this.attachInternals() as unknown as FormInternals)
        : undefined;
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  get multiple(): boolean {
    return this.hasAttribute('multiple');
  }

  get value(): string | string[] {
    const values = chosenOptions(this).map(optionValue);
    return this.multiple ? values : (values[0] ?? '');
  }

  set value(next: string | readonly string[]) {
    setChosen(this, typeof next === 'string' ? [next] : next);
    this.syncFormValue();
  }

  /** The form the Select submits with, or null. */
  get form(): HTMLFormElement | null {
    return this.#internals?.form ?? null;
  }

  connectedCallback(): void {
    this.syncFormValue();
    // A re-render that changes which options are chosen (the application's
    // controlled value) is the new form value too, as are options the parser
    // adds after the element connects (a page parsed with it already defined).
    this.#observer ??= new MutationObserver(() => this.syncFormValue());
    this.#observer.observe(this, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-selected'],
    });
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
  }

  /** A form reset returns to the rendered (default) choice. */
  formResetCallback(): void {
    setChosen(
      this,
      optionsOf(this)
        .filter((option) => option.hasAttribute('data-default-selected'))
        .map(optionValue),
    );
    this.syncFormValue();
  }

  /** Publish the current choice as the form value. */
  syncFormValue(): void {
    const internals = this.#internals;
    if (!internals) return;
    const values = chosenOptions(this).map(optionValue);
    if (!this.multiple) {
      internals.setFormValue(values[0] ?? null);
      return;
    }
    const data = new FormData();
    for (const value of values) data.append(this.name, value);
    internals.setFormValue(data);
  }
}
