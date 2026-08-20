/**
 * `kerfjs/overlay` — the modal / overlay + dismiss manager.
 *
 * Every real kerf app hand-rolls this: `toElement → body.appendChild → mount →
 * wire dismissal → remove`, plus the fiddly parts (Escape, backdrop / outside
 * click, focus trap, restoring focus on close). `window.confirm` is a no-op in
 * Tauri WKWebViews, so a hand-built overlay is mandatory there. This subpath
 * blesses the pattern as three functions over `mount()` — `overlay()`, and the
 * `confirm()` / `toast()` conveniences built on it. No per-instance framework
 * state: each call owns its DOM + listeners in a closure and returns a handle.
 *
 *   import { overlay, confirm, toast } from 'kerfjs/overlay';
 *
 *   const ok = await confirm('Delete this file?', { danger: true });
 *   toast('Saved');
 *   const dialog = overlay(<Settings />, { dismiss: ['escape', 'backdrop'] });
 *   // …later: dialog.close();  or  await dialog.result;
 *
 * Structural only — kerf ships no CSS. The wrapper gets your `className`; style
 * the backdrop / centering / animation yourself.
 */
import { delegate } from './delegate.js';
import { jsx, type SafeHtml } from './jsx-runtime.js';
import { mount, type MountResult } from './mount.js';
import { type AnchorPositionOptions, autoReposition, type PopoverPlacement, positionAnchored } from './overlay-position.js';

/** A user-initiated dismissal trigger. */
export type DismissTrigger = 'escape' | 'backdrop' | 'outside';

/** Content for an overlay: static `SafeHtml`, or a render function `mount()` drives reactively. */
export type OverlayContent = SafeHtml | (() => MountResult);

/** Options for {@link overlay}. */
export interface OverlayOptions {
  /** Where to append the overlay wrapper. Default `document.body`. */
  container?: Element;
  /** Class on the wrapper element (you style it — kerf ships no CSS). Default `'kerf-overlay'`. */
  className?: string;
  /**
   * Which user actions dismiss the overlay. Default `['escape', 'backdrop']`.
   * `'backdrop'` = a click on the wrapper itself (not its content); `'outside'`
   * = a click anywhere outside the wrapper (for anchored popovers). `false`
   * disables user dismissal (close it programmatically).
   */
  dismiss?: DismissTrigger | DismissTrigger[] | false;
  /**
   * Where focus lands on open: a selector, `true` (first focusable element, or
   * the wrapper if none), or `false` (leave focus alone). Default `true`.
   */
  initialFocus?: string | boolean;
  /**
   * Trap Tab / Shift+Tab within the overlay while open and mark it
   * `role="dialog"` / `aria-modal="true"`. Default `true`. Set `false` for a
   * non-modal popover.
   */
  trap?: boolean;
  /** ARIA role for the wrapper when `trap` is on. Default `'dialog'`. */
  role?: string;
  /** Called on any user-initiated dismissal (before `close()` runs). */
  onDismiss?: () => void;
  /** For `'outside'` dismissal: clicks on these elements do NOT count as outside (e.g. the trigger button). */
  outsideIgnore?: Element | readonly Element[];
}

/** Handle returned by {@link overlay}. Holds no framework state — it's a closure. */
export interface OverlayHandle {
  /** The wrapper element (mounted into, appended to `container`). */
  el: HTMLElement;
  /** Tear down: dispose the mount, remove listeners + the node, restore focus, resolve `result`. Idempotent. */
  close(result?: unknown): void;
  /** Resolves with the value passed to `close()` (or `undefined` on user dismissal). */
  result: Promise<unknown>;
}

const FOCUSABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]),'
  + 'select:not([disabled]),textarea:not([disabled]),iframe,'
  + '[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

function focusable(root: Element): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('hidden'),
  );
}

/**
 * Open an overlay: append a wrapper to `container`, `mount()` `content` inside
 * it, wire the requested dismissals + (optionally) a focus trap, and return a
 * handle. See {@link OverlayOptions}.
 */
export function overlay(content: OverlayContent, options: OverlayOptions = {}): OverlayHandle {
  const {
    container = document.body,
    className = 'kerf-overlay',
    dismiss = ['escape', 'backdrop'],
    initialFocus = true,
    trap = true,
    role = 'dialog',
    onDismiss,
    outsideIgnore,
  } = options;

  const triggers: readonly DismissTrigger[] =
    dismiss === false ? [] : Array.isArray(dismiss) ? dismiss : [dismiss];
  const restoreTo = document.activeElement;

  const wrapper = document.createElement('div');
  wrapper.className = className;
  if (trap) {
    wrapper.setAttribute('role', role);
    wrapper.setAttribute('aria-modal', 'true');
  }
  container.appendChild(wrapper);

  const disposeMount = mount(wrapper, typeof content === 'function' ? content : () => content);

  const removers: Array<() => void> = [];
  const resultBox: { resolve?: (value: unknown) => void } = {};
  const result = new Promise<unknown>((resolve) => {
    resultBox.resolve = resolve;
  });
  const state = { closed: false };

  function close(value?: unknown): void {
    if (state.closed) return;
    state.closed = true;
    for (const remove of removers) remove();
    disposeMount();
    wrapper.remove();
    if (restoreTo instanceof HTMLElement && restoreTo.isConnected) restoreTo.focus();
    resultBox.resolve?.(value);
  }

  function userDismiss(): void {
    onDismiss?.();
    close();
  }

  const wantEscape = triggers.includes('escape');
  if (wantEscape || trap) {
    const onKeydown = (event: KeyboardEvent): void => {
      if (wantEscape && event.key === 'Escape') {
        event.stopPropagation();
        userDismiss();
        return;
      }
      if (trap && event.key === 'Tab') {
        const items = focusable(wrapper);
        if (items.length === 0) {
          event.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        const outside = !wrapper.contains(active);
        if (event.shiftKey && (active === first || outside)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || outside)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeydown, true);
    removers.push(() => document.removeEventListener('keydown', onKeydown, true));
  }

  if (triggers.includes('backdrop')) {
    const onClick = (event: Event): void => {
      if (event.target === wrapper) userDismiss();
    };
    wrapper.addEventListener('click', onClick);
    removers.push(() => wrapper.removeEventListener('click', onClick));
  }

  if (triggers.includes('outside')) {
    const ignore = outsideIgnore === undefined
      ? []
      : Array.isArray(outsideIgnore) ? outsideIgnore : [outsideIgnore];
    // Capture phase: the click that opened this overlay already passed
    // document's capture phase, so this never fires for that opening click.
    const onDocClick = (event: Event): void => {
      const target = event.target as Node | null;
      if (target === null) return;
      if (wrapper.contains(target)) return;
      if (ignore.some((el) => el === target || el.contains(target))) return;
      userDismiss();
    };
    document.addEventListener('click', onDocClick, true);
    removers.push(() => document.removeEventListener('click', onDocClick, true));
  }

  if (initialFocus !== false) {
    if (typeof initialFocus === 'string') {
      wrapper.querySelector<HTMLElement>(initialFocus)?.focus();
    } else {
      const first = focusable(wrapper)[0];
      if (first !== undefined) {
        first.focus();
      } else {
        wrapper.tabIndex = -1;
        wrapper.focus();
      }
    }
  }

  return { el: wrapper, close, result };
}

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
  const { container, className = 'kerf-overlay', title, okText = 'OK', cancelText = 'Cancel', render } = options;

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
  const { container, className = 'kerf-overlay', title, defaultValue, render } = options;
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

// The anchored-positioning primitives — `positionAnchored` / `autoReposition`
// plus their option types — live in `./overlay-position.ts` (KF-511) since they
// stand alone (any element, no overlay lifecycle). Re-exported here so the
// `kerfjs/overlay` surface is unchanged; `popover()` / `tooltip()` below build on
// `autoReposition` (imported above).
export { type AnchorPositionOptions, autoReposition, type PopoverPlacement, positionAnchored };

/** Options for {@link popover}. */
export interface PopoverOptions {
  /** Where to append the popover wrapper. Default `document.body`. */
  container?: Element;
  /** Class on the wrapper. Default `'kerf-popover'`. */
  className?: string;
  /** Preferred side of the anchor. Flips to the other side if it would overflow the viewport. Default `'bottom'`. */
  placement?: PopoverPlacement;
  /** Horizontal edge to line up with the anchor: `'start'` (left edges) or `'end'` (right edges). Default `'start'`. */
  align?: 'start' | 'end';
  /** Gap in px between the anchor and the popover. Default `4`. */
  gap?: number;
  /**
   * Which user actions dismiss the popover. Default `['outside']` (a click
   * outside the popover, the anchor exempt). Pass `false` to close only via `close()`.
   */
  dismiss?: DismissTrigger | DismissTrigger[] | false;
  /** Focus behavior on open. Default `false` (non-modal — leave focus alone). */
  initialFocus?: string | boolean;
  /** Extra elements (besides the anchor) whose clicks do NOT count as outside. */
  outsideIgnore?: Element | readonly Element[];
  /** Called on any user-initiated dismissal. */
  onDismiss?: () => void;
}

/**
 * Anchored, non-modal overlay: positions `content` relative to `anchor` (below by
 * default, flipping above if it would overflow, and clamped horizontally to the
 * viewport) and repositions on scroll / resize while open. A thin wrapper over
 * {@link overlay} with non-modal defaults — `trap: false`, `dismiss: ['outside']`,
 * and the anchor added to `outsideIgnore` so the trigger click doesn't self-close.
 * Returns the same {@link OverlayHandle}; `close()` also drops the reposition
 * listeners. `position: fixed` is set inline (you style everything else).
 */
export function popover(
  anchor: Element,
  content: OverlayContent,
  options: PopoverOptions = {},
): OverlayHandle {
  const {
    container,
    className = 'kerf-popover',
    placement = 'bottom',
    align = 'start',
    gap = 4,
    dismiss = ['outside'],
    initialFocus = false,
    outsideIgnore,
    onDismiss,
  } = options;

  const extraIgnore = outsideIgnore === undefined
    ? []
    : Array.isArray(outsideIgnore) ? [...outsideIgnore] : [outsideIgnore];

  const handle = overlay(content, {
    container,
    className,
    dismiss,
    trap: false,
    initialFocus,
    onDismiss,
    outsideIgnore: [anchor, ...extraIgnore],
  });

  // Position + keep it glued while open; drop the listeners on close.
  const stopReposition = autoReposition(handle.el, anchor, { placement, align, gap });
  void handle.result.then(stopReposition);

  return handle;
}

/** Content for a {@link tooltip}: text (auto-escaped), `SafeHtml`, or a render function. */
export type TooltipContent = string | SafeHtml | (() => MountResult);

/** Options for {@link tooltip}. */
export interface TooltipOptions extends AnchorPositionOptions {
  /** Where to append the tooltip wrapper. Default `document.body`. */
  container?: Element;
  /** Class on the wrapper. Default `'kerf-tooltip'`. */
  className?: string;
  /** Delay in ms before showing after hover/focus enters. Default `400`. */
  delay?: number;
  /** Delay in ms before hiding after hover/focus leaves. Default `100`. */
  hideDelay?: number;
  /** ARIA role on the wrapper. Default `'tooltip'`. */
  role?: string;
}

/**
 * A hover/focus-triggered, non-modal, auto-hiding tooltip anchored to `anchor`.
 * Shows after `delay` on `pointerenter`/`focus`, hides after `hideDelay` on
 * `pointerleave`/`blur`, and positions itself with {@link autoReposition} (above
 * the anchor by default). Unlike {@link popover} there is no click-dismiss model —
 * it follows the pointer/focus. Returns a disposer that removes the anchor
 * listeners and hides any shown tooltip. Structural only (kerf ships no CSS).
 */
export function tooltip(anchor: Element, content: TooltipContent, options: TooltipOptions = {}): () => void {
  const {
    container,
    className = 'kerf-tooltip',
    delay = 400,
    hideDelay = 100,
    role = 'tooltip',
    placement = 'top',
    align = 'start',
    gap = 4,
  } = options;

  const body: OverlayContent = typeof content === 'function'
    ? content
    : typeof content === 'string'
      ? jsx('span', { class: `${className}__text`, children: content })
      : content;

  const timers: { show?: ReturnType<typeof setTimeout>; hide?: ReturnType<typeof setTimeout> } = {};
  let current: { handle: OverlayHandle; stop: () => void } | undefined;

  function show(): void {
    const handle = overlay(body, { container, className, dismiss: false, trap: false, initialFocus: false });
    handle.el.setAttribute('role', role);
    const stop = autoReposition(handle.el, anchor, { placement, align, gap });
    current = { handle, stop };
  }

  function hide(): void {
    if (current === undefined) return;
    current.stop();
    current.handle.close();
    current = undefined;
  }

  const onEnter = (): void => {
    if (timers.hide !== undefined) clearTimeout(timers.hide);
    if (current !== undefined) return;
    if (timers.show !== undefined) clearTimeout(timers.show); // debounce: one pending show at a time
    timers.show = setTimeout(show, delay);
  };
  const onLeave = (): void => {
    if (timers.show !== undefined) clearTimeout(timers.show);
    if (current === undefined) return;
    timers.hide = setTimeout(hide, hideDelay);
  };

  anchor.addEventListener('pointerenter', onEnter);
  anchor.addEventListener('pointerleave', onLeave);
  anchor.addEventListener('focus', onEnter);
  anchor.addEventListener('blur', onLeave);

  return () => {
    anchor.removeEventListener('pointerenter', onEnter);
    anchor.removeEventListener('pointerleave', onLeave);
    anchor.removeEventListener('focus', onEnter);
    anchor.removeEventListener('blur', onLeave);
    if (timers.show !== undefined) clearTimeout(timers.show);
    if (timers.hide !== undefined) clearTimeout(timers.hide);
    hide();
  };
}

// `toast()` (and its `ToastContent` / `ToastOptions` / `ToastVariant` /
// `ToastHandle` types) lives in `./overlay-toast.ts` (KF-513) — a distinct
// transient-UI concern from the modal dialogs above. Re-exported so the
// `kerfjs/overlay` surface is unchanged.
export { toast, type ToastContent, type ToastHandle, type ToastOptions, type ToastVariant } from './overlay-toast.js';
