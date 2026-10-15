type Root = HTMLElement | Document;

const CLEAR = '[data-text-field-clear]';
const FIELD = '[data-component="text-field"]';
const INPUT = '.kui-text-field__input';

/**
 * Make every clearable `TextField` below root clear itself: its clear button
 * empties the field, announces the change with bubbling `input` and `change`
 * events (as typing would), and returns focus to the field. The button hides
 * itself while the field is empty. A field with `showCount` keeps its
 * `count / maxLength` current as people type. Dispose with the owning
 * application.
 */
export function wireTextFields(root: Root): () => void {
  const onClick = (event: Event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>(CLEAR)
        : null;
    const input = button
      ?.closest(FIELD)
      ?.querySelector<HTMLInputElement>(INPUT);
    if (!input || input.disabled || input.readOnly) return;
    event.preventDefault();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
  };
  const onInput = (event: Event) => {
    const input = event.target;
    if (!(
      input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement
    ))
      return;
    const count = input
      .closest(FIELD)
      ?.querySelector<HTMLElement>('[data-text-field-count]');
    if (!count || !input.matches(INPUT)) return;
    count.textContent = `${String(input.value.length)} / ${String(input.maxLength)}`;
  };
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('input', onInput);
  };
}
