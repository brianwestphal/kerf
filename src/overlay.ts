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
}

/**
 * A promise-based `window.confirm` replacement (that global is a no-op in Tauri
 * webviews). Renders a two-button dialog and resolves `true` for OK, `false`
 * for Cancel or any dismissal (Escape / backdrop). Message + labels are
 * auto-escaped (rendered through the JSX runtime).
 */
export function confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const {
    container,
    className = 'kerf-overlay',
    title,
    okText = 'OK',
    cancelText = 'Cancel',
    danger = false,
  } = options;

  const body: SafeHtml = jsx('div', {
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
    initialFocus: '.kerf-confirm__ok',
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
}

/**
 * A promise-based `window.prompt` replacement (that global is a no-op in Tauri
 * webviews). Renders a one-field dialog and resolves the entered **string** on OK
 * (an empty string is a valid result) or `null` on Cancel / dismissal. Enter in
 * the input submits. `message`, the default value, and labels are auto-escaped
 * (rendered through the JSX runtime). Optional `validate` blocks OK inline.
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
  } = options;

  const body: SafeHtml = jsx('div', {
    class: 'kerf-prompt',
    children: [
      title !== undefined ? jsx('h2', { class: 'kerf-prompt__title', children: title }) : '',
      jsx('label', { class: 'kerf-prompt__message', children: message }),
      jsx('input', {
        class: 'kerf-prompt__input',
        type: inputType,
        value: defaultValue,
        ...(placeholder !== undefined ? { placeholder } : {}),
        'data-prompt-input': '',
      }),
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
    initialFocus: '.kerf-prompt__input',
    trap: true,
  });

  // Both elements are rendered unconditionally into this call's own wrapper, so
  // the queries cannot miss (asserted non-null rather than guarded).
  const input = handle.el.querySelector<HTMLInputElement>('[data-prompt-input]')!;
  const errorEl = handle.el.querySelector<HTMLElement>('[data-prompt-error]')!;
  errorEl.hidden = true;

  function attemptOk(): void {
    const value = input.value;
    const error = validate?.(value);
    if (typeof error === 'string' && error.length > 0) {
      errorEl.textContent = error;
      errorEl.hidden = false;
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
  const { container, className = 'kerf-overlay', title, okText = 'OK', cancelText = 'Cancel' } = options;

  const body: SafeHtml = jsx('div', {
    class: 'kerf-form',
    children: [
      title !== undefined ? jsx('h2', { class: 'kerf-form__title', children: title }) : '',
      ...fields.map((field) =>
        jsx('div', {
          class: 'kerf-form__field',
          children: [
            jsx('label', { class: 'kerf-form__label', children: field.label ?? field.name }),
            jsx('input', {
              class: 'kerf-form__input',
              type: field.type ?? 'text',
              name: field.name,
              value: field.defaultValue ?? '',
              ...(field.placeholder !== undefined ? { placeholder: field.placeholder } : {}),
              'data-field': field.name,
            }),
            jsx('p', {
              class: 'kerf-form__error',
              'data-field-error': field.name,
              children: '',
            }),
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
    initialFocus: '.kerf-form__input',
    trap: true,
  });

  // Look up a field's input / error node by attribute value (no selector
  // escaping needed — field names are developer-supplied identifiers). Every
  // field renders both nodes into this wrapper, so the lookup cannot miss.
  const byAttr = <E extends HTMLElement>(attr: string, name: string): E =>
    Array.from(handle.el.querySelectorAll<E>(`[${attr}]`)).find(
      (el) => el.getAttribute(attr) === name,
    )!;

  // Start with every field's error hidden.
  for (const field of fields) {
    byAttr<HTMLElement>('data-field-error', field.name).hidden = true;
  }

  function attemptOk(): void {
    const record: Record<string, string> = {};
    let firstInvalid: HTMLInputElement | null = null;
    for (const field of fields) {
      const el = byAttr<HTMLInputElement>('data-field', field.name);
      const value = el.value;
      record[field.name] = value;
      const error = field.validate?.(value);
      const errorEl = byAttr<HTMLElement>('data-field-error', field.name);
      if (typeof error === 'string' && error.length > 0) {
        errorEl.textContent = error;
        errorEl.hidden = false;
        if (firstInvalid === null) firstInvalid = el;
      } else {
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

/** Vertical placement relative to an anchor (used by {@link popover}, {@link positionAnchored}, {@link tooltip}). */
export type PopoverPlacement = 'bottom' | 'top';

/** Placement options for {@link positionAnchored} / {@link autoReposition}. */
export interface AnchorPositionOptions {
  /** Preferred side of the anchor; flips to the other side if it would overflow the viewport. Default `'bottom'`. */
  placement?: PopoverPlacement;
  /** Horizontal edge to line up with the anchor: `'start'` (left edges) or `'end'` (right edges). Default `'start'`. */
  align?: 'start' | 'end';
  /** Gap in px between the anchor and the element. Default `4`. */
  gap?: number;
}

/**
 * One-shot: position `el` relative to `anchor` — below by default, flipping above
 * if it would overflow the viewport, aligned to a horizontal edge and clamped into
 * view. Sets `el.style` `position: fixed`, `margin: 0`, `left`, and `top` (fixed so
 * `left`/`top` are viewport coordinates, matching `getBoundingClientRect`). This is
 * `popover()`'s placement core, usable on any element (an inline hint, a tooltip) —
 * no overlay lifecycle. Pair with {@link autoReposition} to keep it glued while open.
 */
export function positionAnchored(el: HTMLElement, anchor: Element, options: AnchorPositionOptions = {}): void {
  const { placement = 'bottom', align = 'start', gap = 4 } = options;
  const a = anchor.getBoundingClientRect();
  const p = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Vertical: preferred side, flipped only if it overflows and the other side fits.
  const belowTop = a.bottom + gap;
  const aboveTop = a.top - gap - p.height;
  let below = placement !== 'top';
  if (below && belowTop + p.height > vh && aboveTop >= 0) below = false;
  else if (!below && aboveTop < 0 && belowTop + p.height <= vh) below = true;

  // Horizontal: align to an anchor edge, then clamp into the viewport.
  let left = align === 'end' ? a.right - p.width : a.left;
  left = Math.max(0, Math.min(left, vw - p.width));

  el.style.position = 'fixed';
  el.style.margin = '0';
  el.style.left = `${left}px`;
  el.style.top = `${below ? belowTop : aboveTop}px`;
}

/**
 * Keep `el` positioned against `anchor` (via {@link positionAnchored}) as the page
 * scrolls or resizes. Positions once immediately, then re-runs on `scroll`
 * (capture phase — catches scrolls in any inner container, not just `window`) and
 * `resize`. Returns a disposer that removes the listeners.
 */
export function autoReposition(el: HTMLElement, anchor: Element, options: AnchorPositionOptions = {}): () => void {
  const reposition = (): void => positionAnchored(el, anchor, options);
  reposition();
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);
  return () => {
    window.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition);
  };
}

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

/** Content for a {@link toast}: text, `SafeHtml`, or a render function. */
export type ToastContent = string | SafeHtml | (() => MountResult);

/** Accent variant for a {@link toast} — mapped to a `${className}--${variant}` class. */
export type ToastVariant = 'info' | 'success' | 'warning';

/** Options for {@link toast}. */
export interface ToastOptions {
  /** Where toasts stack. Default: a lazily-created `<div class="kerf-toasts">` on `document.body`. */
  container?: Element;
  /** Class on the toast element. Default `'kerf-toast'`. */
  className?: string;
  /** Auto-dismiss after this many ms. `0` keeps it until dismissed by hand. Default `4000`. */
  duration?: number;
  /** ARIA role. Default `'status'`. */
  role?: string;
  /**
   * `'stack'` (default) shows toasts stacked in the region; `'replace'` dismisses
   * the region's current toast(s) first (collapse-to-latest for a rapid sequence).
   */
  mode?: 'stack' | 'replace';
  /** Accent variant — adds a `${className}--${variant}` class (kerf ships no CSS; you style it). */
  variant?: ToastVariant;
  /** Class added on the next animation frame after mount, so a CSS **entrance** transition can run. */
  enterClass?: string;
  /** Class added when dismissing, so CSS owns the **exit** — the node is removed `exitDuration` ms later. */
  exitClass?: string;
  /** ms to wait after `exitClass` is added before removing the node. Default `0`. */
  exitDuration?: number;
}

/** Handle returned by {@link toast}. */
export interface ToastHandle {
  /** The toast element — inspect it, or run your own entrance/exit transitions. */
  el: HTMLElement;
  /** Dismiss it early (running the `exitClass` transition if set). Idempotent. */
  dismiss(): void;
}

/** The region's active toasts live on the region element (in the DOM), not in module state. */
const TOAST_SET = Symbol('kerf.toasts');
type ToastCarrier = Element & { [TOAST_SET]?: Set<() => void> };

/** The singleton toast region lives in the DOM (queried, not held in a module variable). */
function toastRegion(container?: Element): Element {
  if (container !== undefined) return container;
  const existing = document.querySelector('.kerf-toasts');
  if (existing !== null) return existing;
  const region = document.createElement('div');
  region.className = 'kerf-toasts';
  region.setAttribute('aria-live', 'polite');
  document.body.appendChild(region);
  return region;
}

/**
 * Show a non-modal, auto-dismissing notification. Stacks in a shared body-level
 * region (or your `container`). Returns a {@link ToastHandle} (`{ el, dismiss }`)
 * so you can run entrance/exit transitions, wire an action button, or inspect the
 * node. `mode: 'replace'` collapses a rapid sequence to the latest; `variant`
 * adds an accent class; `enterClass`/`exitClass` let CSS own the animation.
 */
export function toast(content: ToastContent, options: ToastOptions = {}): ToastHandle {
  const {
    container,
    className = 'kerf-toast',
    duration = 4000,
    role = 'status',
    mode = 'stack',
    variant,
    enterClass,
    exitClass,
    exitDuration = 0,
  } = options;

  const region = toastRegion(container) as ToastCarrier;
  const active = (region[TOAST_SET] ??= new Set<() => void>());
  if (mode === 'replace') for (const d of [...active]) d(); // collapse-to-latest

  const el = document.createElement('div');
  el.className = className;
  if (variant !== undefined) el.classList.add(`${className}--${variant}`);
  el.setAttribute('role', role);
  region.appendChild(el);

  const disposeMount = mount(el, typeof content === 'function' ? content : () => content);
  const state: {
    dismissed: boolean;
    timer: ReturnType<typeof setTimeout> | undefined;
  } = { dismissed: false, timer: undefined };

  if (enterClass !== undefined) {
    globalThis.requestAnimationFrame(() => {
      if (!state.dismissed) el.classList.add(enterClass);
    });
  }

  const remove = (): void => {
    disposeMount();
    el.remove();
    active.delete(dismiss);
  };

  function dismiss(): void {
    if (state.dismissed) return;
    state.dismissed = true;
    if (state.timer !== undefined) clearTimeout(state.timer);
    if (exitClass !== undefined) {
      el.classList.add(exitClass);
      setTimeout(remove, exitDuration);
    } else {
      remove();
    }
  }

  active.add(dismiss);
  if (duration > 0) state.timer = setTimeout(dismiss, duration);
  return { el, dismiss };
}
