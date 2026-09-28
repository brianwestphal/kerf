// Web Awesome's wa-option owns its accessibility semantics: it sets
// `role="option"` and `aria-selected` / `aria-disabled` itself, from its live
// `selected` / `disabled` state. A Kerf Select's template does not render those
// attributes, so a kerf re-render (the morph removes attributes the template
// omits) stripped them and assistive technology lost every option's role and
// selected state. This boundary restores them from the option's live state
// whenever anything removes or rewrites them, only inside Kerf Selects
// (`data-component="select"`).

interface SemanticOption extends HTMLElement {
  selected: boolean;
  disabled: boolean;
}

interface SelectPrototype {
  updated(this: HTMLElement, changedProperties: unknown): void;
}

const OWNED = ['role', 'aria-selected', 'aria-disabled'];

function sync(element: HTMLElement, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/** Re-apply the attributes Web Awesome derives from the option's live state. */
export function restoreOptionSemantics(option: SemanticOption): void {
  sync(option, 'role', 'option');
  sync(option, 'aria-selected', option.selected ? 'true' : 'false');
  sync(option, 'aria-disabled', option.disabled ? 'true' : 'false');
}

/** Install once at the explicit registration boundary, only for Kerf Selects. */
export function installSelectOptionSemantics(prototype: object): void {
  const installed = Symbol.for('@kerfjs/ui/select-option-semantics');
  if (Object.prototype.hasOwnProperty.call(prototype, installed)) return;
  Object.defineProperty(prototype, installed, { value: true });

  // Custom-element lifecycle callbacks are captured when the element is
  // defined, so a later `connectedCallback` patch would never run. Lit calls
  // `updated()` through the prototype after every render, the first one
  // included, which makes it the attach point. The observer lives as long as
  // the Select: a detached Select produces no records, and one that
  // reconnects keeps its observer.
  const select = prototype as SelectPrototype;
  const updated = select.updated;
  const observed = new WeakSet<HTMLElement>();
  select.updated = function (changedProperties) {
    updated.call(this, changedProperties);
    if (this.dataset.component !== 'select' || observed.has(this)) return;
    observed.add(this);
    new MutationObserver((records) => {
      for (const record of records) {
        const option = record.target as HTMLElement;
        if (option.localName === 'wa-option') {
          restoreOptionSemantics(option as SemanticOption);
        }
      }
    }).observe(this, {
      subtree: true,
      attributes: true,
      attributeFilter: OWNED,
    });
  };
}
