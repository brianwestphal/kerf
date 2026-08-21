/**
 * `kerfjs/overlay` promise-dialog helpers — `confirm` / `prompt` / `form` /
 * `choice` (split out of `overlay.ts`). Each is a thin builder over `overlay()`:
 * it renders a default body (or the caller's `render` slot), wires the
 * buttons / inputs via `delegate()`, and resolves a promise on OK / Cancel /
 * dismissal. `overlay()` keeps owning the wrapper, mount, dismiss, focus-trap,
 * focus-restore, and (opt-in) native top-layer backing.
 *
 * Re-exported from `overlay.ts` so the `kerfjs/overlay` subpath surface is
 * unchanged (`import { confirm } from 'kerfjs/overlay'`). It imports `overlay`
 * back from `overlay.ts`; that reference is only ever read at call time (the
 * dialogs invoke `overlay()` when called, never at module load), so the module
 * cycle is safe.
 */
import { delegate } from './delegate.js';
import { jsx } from './jsx-runtime.js';
import { overlay, type OverlayContent } from './overlay.js';

/**
 * Wiring slots passed to a {@link ConfirmOptions.render} — spread `ok` / `cancel`
 * onto your own clickable elements so `confirm()` still resolves them (they are
 * `data-confirm` attribute bags). `message` is the raw message (escape it by
 * interpolating through JSX).
 */
export interface ConfirmRenderSlots {
  message: string;
  /** Spread onto the confirm control. */
  ok: Record<string, string>;
  /** Spread onto the cancel control. */
  cancel: Record<string, string>;
}

/** Options for {@link confirm}. */
export interface ConfirmOptions {
  /** Where to append the overlay. Default `document.body`. */
  container?: Element;
  /** Wrapper class. Default `'kerf-overlay'`. */
  className?: string;
  /** Optional heading above the message. */
  title?: string;
  /** Confirm button label. Default `'OK'`. */
  okText?: string;
  /** Cancel button label. Default `'Cancel'`. */
  cancelText?: string;
  /** Add a `kerf-confirm--danger` class to the wrapper for destructive actions. */
  danger?: boolean;
  /** Host the dialog in the browser top layer (`<dialog>.showModal()`) where supported. See {@link OverlayOptions.native}. */
  native?: boolean;
  /**
   * Bring your own markup (design-system dialogs): return the full dialog body,
   * spreading the provided `ok`/`cancel` wiring onto your buttons. Overrides the
   * default two-button markup; `confirm()` keeps owning dismiss / focus-trap /
   * focus-restore and still resolves `true`/`false` for OK/Cancel/dismissal.
   */
  render?: (slots: ConfirmRenderSlots) => OverlayContent;
}

/**
 * A promise-based `window.confirm` replacement (that global is a no-op in Tauri
 * webviews). Renders a two-button dialog and resolves `true` for OK, `false`
 * for Cancel or any dismissal (Escape / backdrop). Message + labels are
 * auto-escaped (rendered through the JSX runtime). Pass `render` for your own markup.
 */
export function confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const {
    container,
    className = 'kerf-overlay',
    title,
    okText = 'OK',
    cancelText = 'Cancel',
    danger = false,
    native = false,
    render,
  } = options;

  const body: OverlayContent = render !== undefined
    ? render({ message, ok: { 'data-confirm': 'ok' }, cancel: { 'data-confirm': 'cancel' } })
    : jsx('div', {
      class: 'kerf-confirm',
      children: [
        title !== undefined ? jsx('h2', { class: 'kerf-confirm__title', children: title }) : '',
        jsx('p', { class: 'kerf-confirm__message', children: message }),
        jsx('div', {
          class: 'kerf-confirm__actions',
          children: [
            jsx('button', { type: 'button', 'data-confirm': 'cancel', children: cancelText }),
            jsx('button', {
              type: 'button',
              'data-confirm': 'ok',
              class: 'kerf-confirm__ok',
              children: okText,
            }),
          ],
        }),
      ],
    });

  const handle = overlay(body, {
    container,
    className: danger ? `${className} kerf-confirm--danger` : className,
    dismiss: ['escape', 'backdrop'],
    initialFocus: '[data-confirm="ok"]',
    trap: true,
    native,
  });

  delegate(handle.el, 'click', '[data-confirm]', (_event, el) => {
    handle.close(el.getAttribute('data-confirm') === 'ok');
  });

  return handle.result.then((value) => value === true);
}

/**
 * Validate a single field's value. Return a non-empty error string to BLOCK
 * submission (shown inline next to the field); return `undefined`/`null`/`''` to
 * allow it.
 */
export type FieldValidator = (value: string) => string | null | undefined | void;

/** Options for {@link prompt}. */
export interface PromptOptions {
  /** Where to append the overlay. Default `document.body`. */
  container?: Element;
  /** Wrapper class. Default `'kerf-overlay'`. */
  className?: string;
  /** Optional heading above the message. */
  title?: string;
  /** Pre-filled input value. Default `''`. */
  defaultValue?: string;
  /** Input placeholder. */
  placeholder?: string;
  /** `type` attribute of the input (`'text'`, `'email'`, `'password'`, …). Default `'text'`. */
  inputType?: string;
  /** Confirm button label. Default `'OK'`. */
  okText?: string;
  /** Cancel button label. Default `'Cancel'`. */
  cancelText?: string;
  /** Block OK while this returns an error string; the message shows inline. */
  validate?: FieldValidator;
  /** Host the dialog in the browser top layer (`<dialog>.showModal()`) where supported. See {@link OverlayOptions.native}. */
  native?: boolean;
  /**
   * Bring your own markup: return the full dialog body, spreading the provided
   * `input` (the text field), `ok`/`cancel` (buttons), and optional `error` (the
   * inline-error slot) wiring. `prompt()` still reads the input, runs `validate`,
   * submits on Enter, and owns dismiss / focus. If you omit the `error` slot,
   * `validate` simply re-focuses the input without an inline message.
   */
  render?: (slots: PromptRenderSlots) => OverlayContent;
}

/** Wiring slots for a {@link PromptOptions.render} — spread each onto your own markup. */
export interface PromptRenderSlots {
  message: string;
  /** Spread onto your `<input>` — carries the marker, `type`, `value`, and `placeholder`. */
  input: Record<string, string>;
  /** Spread onto your inline-error element (optional). */
  error: Record<string, string>;
  /** Spread onto the confirm control. */
  ok: Record<string, string>;
  /** Spread onto the cancel control. */
  cancel: Record<string, string>;
}

/**
 * A promise-based `window.prompt` replacement (that global is a no-op in Tauri
 * webviews). Renders a one-field dialog and resolves the entered **string** on OK
 * (an empty string is a valid result) or `null` on Cancel / dismissal. Enter in
 * the input submits. `message`, the default value, and labels are auto-escaped
 * (rendered through the JSX runtime). Optional `validate` blocks OK inline. Pass
 * `render` for your own markup.
 */
export function prompt(message: string, options: PromptOptions = {}): Promise<string | null> {
  const {
    container,
    className = 'kerf-overlay',
    title,
    defaultValue = '',
    placeholder,
    inputType = 'text',
    okText = 'OK',
    cancelText = 'Cancel',
    validate,
    native = false,
    render,
  } = options;

  const inputAttrs: Record<string, string> = {
    'data-prompt-input': '',
    type: inputType,
    value: defaultValue,
    ...(placeholder !== undefined ? { placeholder } : {}),
  };

  const body: OverlayContent = render !== undefined
    ? render({
      message,
      input: inputAttrs,
      error: { 'data-prompt-error': '' },
      ok: { 'data-prompt': 'ok' },
      cancel: { 'data-prompt': 'cancel' },
    })
    : jsx('div', {
      class: 'kerf-prompt',
      children: [
        title !== undefined ? jsx('h2', { class: 'kerf-prompt__title', children: title }) : '',
        jsx('label', { class: 'kerf-prompt__message', children: message }),
        jsx('input', { class: 'kerf-prompt__input', ...inputAttrs }),
        jsx('p', { class: 'kerf-prompt__error', 'data-prompt-error': '', children: '' }),
        jsx('div', {
          class: 'kerf-prompt__actions',
          children: [
            jsx('button', { type: 'button', 'data-prompt': 'cancel', children: cancelText }),
            jsx('button', {
              type: 'button',
              'data-prompt': 'ok',
              class: 'kerf-prompt__ok',
              children: okText,
            }),
          ],
        }),
      ],
    });

  const handle = overlay(body, {
    container,
    className,
    dismiss: ['escape', 'backdrop'],
    initialFocus: '[data-prompt-input]',
    trap: true,
    native,
  });

  // The input is required; the error slot is optional (BYO markup may omit it).
  const input = handle.el.querySelector<HTMLInputElement>('[data-prompt-input]')!;
  const errorEl = handle.el.querySelector<HTMLElement>('[data-prompt-error]');
  if (errorEl !== null) errorEl.hidden = true;

  function attemptOk(): void {
    const value = input.value;
    const error = validate?.(value);
    if (typeof error === 'string' && error.length > 0) {
      if (errorEl !== null) {
        errorEl.textContent = error;
        errorEl.hidden = false;
      }
      input.focus();
      return;
    }
    handle.close(value);
  }

  delegate(handle.el, 'click', '[data-prompt]', (_event, el) => {
    if (el.getAttribute('data-prompt') === 'ok') attemptOk();
    else handle.close(null);
  });

  // Enter in the field submits, like the native prompt.
  handle.el.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' && event.target === input) {
      event.preventDefault();
      attemptOk();
    }
  });

  return handle.result.then((value) => (typeof value === 'string' ? value : null));
}

/** A single field in a {@link form}. */
export interface FormField {
  /** Field name — the key in the resolved record (and the input's `name`). */
  name: string;
  /** Label shown above the input. Defaults to `name`. */
  label?: string;
  /** Pre-filled value. Default `''`. */
  defaultValue?: string;
  /** Input placeholder. */
  placeholder?: string;
  /** `type` attribute of the input. Default `'text'`. */
  type?: string;
  /** Block OK while this returns an error string; the message shows inline for this field. */
  validate?: FieldValidator;
}

/** One field's wiring in a {@link FormRenderSlots} — spread `input`/`error` onto your markup. */
export interface FormRenderField {
  name: string;
  label: string;
  /** Spread onto your `<input>` — carries the marker, `name`, `type`, `value`, `placeholder`. */
  input: Record<string, string>;
  /** Spread onto your inline-error element (optional). */
  error: Record<string, string>;
}

/** Wiring slots for a {@link FormOptions.render}. */
export interface FormRenderSlots {
  fields: FormRenderField[];
  /** Spread onto the confirm control. */
  ok: Record<string, string>;
  /** Spread onto the cancel control. */
  cancel: Record<string, string>;
}

/** Options for {@link form}. */
export interface FormOptions {
  /** Where to append the overlay. Default `document.body`. */
  container?: Element;
  /** Wrapper class. Default `'kerf-overlay'`. */
  className?: string;
  /** Optional heading above the fields. */
  title?: string;
  /** Confirm button label. Default `'OK'`. */
  okText?: string;
  /** Cancel button label. Default `'Cancel'`. */
  cancelText?: string;
  /** Host the dialog in the browser top layer (`<dialog>.showModal()`) where supported. See {@link OverlayOptions.native}. */
  native?: boolean;
  /**
   * Bring your own markup: return the full form body, laying out `slots.fields`
   * (each with `input`/`error` wiring to spread) and the `ok`/`cancel` buttons.
   * `form()` still reads each input, runs per-field `validate`, focuses the first
   * invalid field, submits on Enter, and owns dismiss / focus. Omit a field's
   * `error` slot to skip its inline message.
   */
  render?: (slots: FormRenderSlots) => OverlayContent;
}

/**
 * A promise-based multi-field dialog — the two-or-three-input sibling of
 * {@link prompt}. Renders one labeled input per {@link FormField} and resolves a
 * `Record<name, value>` on OK (after every field's `validate` passes) or `null`
 * on Cancel / dismissal. Enter in any field submits. All labels, defaults, and
 * the title are auto-escaped through the JSX runtime.
 */
export function form(
  fields: readonly FormField[],
  options: FormOptions = {},
): Promise<Record<string, string> | null> {
  const {
    container, className = 'kerf-overlay', title, okText = 'OK', cancelText = 'Cancel', native = false, render,
  } = options;

  const fieldAttrs = (field: FormField): Record<string, string> => ({
    'data-field': field.name,
    name: field.name,
    type: field.type ?? 'text',
    value: field.defaultValue ?? '',
    ...(field.placeholder !== undefined ? { placeholder: field.placeholder } : {}),
  });

  const body: OverlayContent = render !== undefined
    ? render({
      fields: fields.map((field) => ({
        name: field.name,
        label: field.label ?? field.name,
        input: fieldAttrs(field),
        error: { 'data-field-error': field.name },
      })),
      ok: { 'data-form': 'ok' },
      cancel: { 'data-form': 'cancel' },
    })
    : jsx('div', {
      class: 'kerf-form',
      children: [
        title !== undefined ? jsx('h2', { class: 'kerf-form__title', children: title }) : '',
        ...fields.map((field) =>
          jsx('div', {
            class: 'kerf-form__field',
            children: [
              jsx('label', { class: 'kerf-form__label', children: field.label ?? field.name }),
              jsx('input', { class: 'kerf-form__input', ...fieldAttrs(field) }),
              jsx('p', { class: 'kerf-form__error', 'data-field-error': field.name, children: '' }),
            ],
          }),
        ),
        jsx('div', {
          class: 'kerf-form__actions',
          children: [
            jsx('button', { type: 'button', 'data-form': 'cancel', children: cancelText }),
            jsx('button', {
              type: 'button',
              'data-form': 'ok',
              class: 'kerf-form__ok',
              children: okText,
            }),
          ],
        }),
      ],
    });

  const handle = overlay(body, {
    container,
    className,
    dismiss: ['escape', 'backdrop'],
    initialFocus: '[data-field]',
    trap: true,
    native,
  });

  // Inputs are required; error nodes are optional (BYO markup may omit them).
  const byAttr = <E extends HTMLElement>(attr: string, name: string): E =>
    Array.from(handle.el.querySelectorAll<E>(`[${attr}]`)).find(
      (el) => el.getAttribute(attr) === name,
    )!;
  const errorFor = (name: string): HTMLElement | null =>
    Array.from(handle.el.querySelectorAll<HTMLElement>('[data-field-error]')).find(
      (el) => el.getAttribute('data-field-error') === name,
    ) ?? null;

  // Start with every field's error hidden.
  for (const field of fields) {
    const errorEl = errorFor(field.name);
    if (errorEl !== null) errorEl.hidden = true;
  }

  function attemptOk(): void {
    const record: Record<string, string> = {};
    let firstInvalid: HTMLInputElement | null = null;
    for (const field of fields) {
      const el = byAttr<HTMLInputElement>('data-field', field.name);
      const value = el.value;
      record[field.name] = value;
      const error = field.validate?.(value);
      const errorEl = errorFor(field.name);
      if (typeof error === 'string' && error.length > 0) {
        if (errorEl !== null) {
          errorEl.textContent = error;
          errorEl.hidden = false;
        }
        if (firstInvalid === null) firstInvalid = el;
      } else if (errorEl !== null) {
        errorEl.hidden = true;
      }
    }
    if (firstInvalid !== null) {
      firstInvalid.focus();
      return;
    }
    handle.close(record);
  }

  delegate(handle.el, 'click', '[data-form]', (_event, el) => {
    if (el.getAttribute('data-form') === 'ok') attemptOk();
    else handle.close(null);
  });

  handle.el.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' && (event.target as Element | null)?.matches('[data-field]')) {
      event.preventDefault();
      attemptOk();
    }
  });

  return handle.result.then((value) =>
    value !== null && typeof value === 'object' ? (value as Record<string, string>) : null,
  );
}

/** One choosable action in a {@link choice} dialog. */
export interface ChoiceAction<R> {
  /** The value this action resolves. */
  value: R;
  /** Button label (auto-escaped). */
  label: string;
  /** Extra class on this action's button. */
  className?: string;
}

/** Wiring slots for a {@link ChoiceOptions.render} — spread `actions[i]` onto your i-th button. */
export interface ChoiceRenderSlots {
  message: string;
  /** One attribute bag per action (in order) — spread onto that action's control. */
  actions: Array<Record<string, string>>;
}

/** Options for {@link choice}. */
export interface ChoiceOptions<R> {
  /** Where to append the overlay. Default `document.body`. */
  container?: Element;
  /** Wrapper class. Default `'kerf-overlay'`. */
  className?: string;
  /** Optional heading above the message. */
  title?: string;
  /** The value resolved when **Enter** is pressed anywhere in the dialog (the default action). */
  defaultValue?: R;
  /** Host the dialog in the browser top layer (`<dialog>.showModal()`) where supported. See {@link OverlayOptions.native}. */
  native?: boolean;
  /** Bring your own markup: return the full body, spreading each `slots.actions[i]` onto your buttons. */
  render?: (slots: ChoiceRenderSlots) => OverlayContent;
}

/**
 * The **N-way** sibling of {@link confirm}: renders one button per {@link ChoiceAction}
 * and resolves that action's `value` on click, or `null` on Cancel / dismissal.
 * Pass `defaultValue` to make **Enter** (anywhere in the dialog) resolve a default
 * action — the "global Enter-to-confirm" model — without you having to hold the
 * overlay handle. `message` + labels are auto-escaped; pass `render` for your own
 * markup. kerf owns dismiss / focus-trap / focus-restore. For fully bespoke
 * keyboard/close control, drive {@link overlay} directly.
 */
export function choice<R>(
  message: string,
  actions: ReadonlyArray<ChoiceAction<R>>,
  options: ChoiceOptions<R> = {},
): Promise<R | null> {
  const { container, className = 'kerf-overlay', title, defaultValue, native = false, render } = options;
  const hasDefault = 'defaultValue' in options;

  const actionAttrs = actions.map((_, i) => ({ 'data-choice': String(i) }));

  const body: OverlayContent = render !== undefined
    ? render({ message, actions: actionAttrs })
    : jsx('div', {
      class: 'kerf-choice',
      children: [
        title !== undefined ? jsx('h2', { class: 'kerf-choice__title', children: title }) : '',
        jsx('p', { class: 'kerf-choice__message', children: message }),
        jsx('div', {
          class: 'kerf-choice__actions',
          children: actions.map((action, i) =>
            jsx('button', {
              type: 'button',
              class: action.className !== undefined ? `kerf-choice__action ${action.className}` : 'kerf-choice__action',
              ...actionAttrs[i],
              children: action.label,
            }),
          ),
        }),
      ],
    });

  // Own the promise (not overlay's result value) so an action `value` of
  // `undefined`/`null` stays distinct from a dismissal.
  let resolveChoice!: (r: R | null) => void;
  const result = new Promise<R | null>((resolve) => {
    resolveChoice = resolve;
  });

  const handle = overlay(body, {
    container,
    className,
    dismiss: ['escape', 'backdrop'],
    initialFocus: '[data-choice]',
    trap: true,
    native,
  });

  delegate(handle.el, 'click', '[data-choice]', (_event, el) => {
    resolveChoice(actions[Number(el.getAttribute('data-choice'))].value);
    handle.close();
  });

  if (hasDefault) {
    handle.el.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        resolveChoice(defaultValue as R);
        handle.close();
      }
    });
  }

  // Any close without a pick (Escape / backdrop / programmatic) → null. First
  // resolve wins, so a prior click/Enter value stands.
  void handle.result.then(() => resolveChoice(null));

  return result;
}
