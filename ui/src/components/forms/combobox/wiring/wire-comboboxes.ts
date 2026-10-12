type Root = HTMLElement | Document;

const INPUT = '.kui-combobox__input';

/** A committed combobox value. */
export interface ComboboxCommit {
  id: string;
  value: string;
  /** True when the value matched no suggestion (the person created it). */
  created: boolean;
  /** The field's input; clear or keep its text after applying the commit. */
  input: HTMLInputElement;
}

export interface WireComboboxesOptions {
  onCommit: (commit: ComboboxCommit) => void;
  /** Characters that commit the typed text besides Enter. Default `[',']`. */
  commitKeys?: readonly string[];
}

interface Parts {
  field: HTMLElement;
  input: HTMLInputElement;
  listbox: HTMLElement;
  create: HTMLElement | null;
}

// `Combobox` renders the input inside its field with its listbox, and every
// suggestion option with `data-value`, so the lookups below cannot miss.
function partsOf(input: HTMLInputElement): Parts {
  const field = input.closest<HTMLElement>('[data-component="combobox"]')!;
  const listbox = field.querySelector<HTMLElement>('[role="listbox"]')!;
  return {
    field,
    input,
    listbox,
    create: listbox.querySelector<HTMLElement>('[data-create]'),
  };
}

const visibleOptions = (parts: Parts) =>
  [...parts.listbox.querySelectorAll<HTMLElement>('[role="option"]')].filter(
    (option) => !option.hidden,
  );

const matches = (option: HTMLElement, text: string) =>
  option.textContent!.toLowerCase().includes(text) ||
  option.dataset.value!.toLowerCase().includes(text);

function setActive(parts: Parts, option: HTMLElement | null) {
  for (const item of parts.listbox.querySelectorAll('[role="option"]'))
    item.setAttribute('aria-selected', String(item === option));
  if (option) {
    parts.input.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView?.({ block: 'nearest' });
  } else parts.input.removeAttribute('aria-activedescendant');
}

function activeOption(parts: Parts): HTMLElement | null {
  const id = parts.input.getAttribute('aria-activedescendant');
  return id
    ? parts.listbox.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
    : null;
}

function close(parts: Parts) {
  parts.listbox.hidden = true;
  parts.input.setAttribute('aria-expanded', 'false');
  setActive(parts, null);
}

/** Filter the suggestions to the typed text and show the create option. */
function update(parts: Parts) {
  const typed = parts.input.value.trim();
  const text = typed.toLowerCase();
  let exact = false;
  for (const option of parts.listbox.querySelectorAll<HTMLElement>(
    '[role="option"]:not([data-create])',
  )) {
    option.hidden = text !== '' && !matches(option, text);
    if (option.dataset.value!.toLowerCase() === text) exact = true;
  }
  if (parts.create) {
    parts.create.hidden = typed === '' || exact;
    parts.create.dataset.value = typed;
    // A create option exists only when the field has a create label.
    parts.create.textContent = parts.field.dataset.createLabel!.replaceAll(
      '{value}',
      typed,
    );
  }
  const options = visibleOptions(parts);
  parts.listbox.hidden = options.length === 0;
  parts.input.setAttribute('aria-expanded', String(options.length > 0));
  if (!options.includes(activeOption(parts)!)) setActive(parts, null);
}

/**
 * Wire every `Combobox` below root: typing filters the suggestions (and offers
 * to create the typed text), ArrowDown/ArrowUp move the active option, Enter or
 * a commit key (comma by default) commits the active option or the typed text,
 * a click commits an option, and Escape or leaving the field closes the list.
 * Typed text that matches no suggestion commits only when the field offers
 * creation; otherwise Enter commits the first matching suggestion. Dispose with the owning application.
 */
export function wireComboboxes(
  root: Root,
  { onCommit, commitKeys = [','] }: WireComboboxesOptions,
): () => void {
  const commit = (parts: Parts, active: HTMLElement | null) => {
    // Without a create option, Enter on partial text takes the first match.
    const option =
      active ?? (parts.create ? null : (visibleOptions(parts)[0] ?? null));
    const typed = parts.input.value.trim();
    // Callers commit only with an option or non-empty typed text.
    const value = option ? option.dataset.value! : typed;
    const suggestion = [
      ...parts.listbox.querySelectorAll<HTMLElement>(
        '[role="option"]:not([data-create])',
      ),
    ].find((item) => item.dataset.value!.toLowerCase() === value.toLowerCase());
    const created = !suggestion;
    if (created && !parts.create) return;
    close(parts);
    onCommit({
      id: parts.field.dataset.comboboxId!,
      value: suggestion?.dataset.value ?? value,
      created,
      input: parts.input,
    });
  };
  const inputOf = (event: Event) =>
    event.target instanceof HTMLInputElement && event.target.matches(INPUT)
      ? event.target
      : null;
  const onInput = (event: Event) => {
    const input = inputOf(event);
    const parts = input && partsOf(input);
    if (parts) update(parts);
  };
  const onFocus = onInput;
  const onKeyDown = (event: Event) => {
    const keyboard = event as KeyboardEvent;
    const input = inputOf(keyboard);
    const parts = input && partsOf(input);
    if (!parts || keyboard.isComposing) return;
    const options = visibleOptions(parts);
    const current = activeOption(parts);
    const index = current ? options.indexOf(current) : -1;
    if (keyboard.key === 'ArrowDown' || keyboard.key === 'ArrowUp') {
      keyboard.preventDefault();
      if (parts.listbox.hidden) update(parts);
      const open = visibleOptions(parts);
      if (open.length === 0) return;
      const step = keyboard.key === 'ArrowDown' ? 1 : -1;
      const next =
        index < 0
          ? step > 0
            ? 0
            : open.length - 1
          : (index + step + open.length) % open.length;
      setActive(parts, open[next]!);
    } else if (keyboard.key === 'Enter' || commitKeys.includes(keyboard.key)) {
      if (!parts.input.value.trim() && !current) return;
      keyboard.preventDefault();
      commit(parts, current);
    } else if (keyboard.key === 'Escape' && !parts.listbox.hidden) {
      keyboard.preventDefault();
      close(parts);
    }
  };
  const onPointerDown = (event: Event) => {
    const option =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('.kui-combobox__option')
        : null;
    const input = option
      ?.closest('[data-component="combobox"]')
      ?.querySelector<HTMLInputElement>(INPUT);
    const parts = input && partsOf(input);
    if (!option || !parts) return;
    // Keep focus in the field; commit on the press itself.
    event.preventDefault();
    commit(parts, option);
  };
  const onFocusOut = (event: Event) => {
    const input = inputOf(event);
    const parts = input && partsOf(input);
    if (parts) close(parts);
  };
  root.addEventListener('input', onInput);
  root.addEventListener('focusin', onFocus);
  root.addEventListener('keydown', onKeyDown);
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('focusout', onFocusOut);
  return () => {
    root.removeEventListener('input', onInput);
    root.removeEventListener('focusin', onFocus);
    root.removeEventListener('keydown', onKeyDown);
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('focusout', onFocusOut);
  };
}
