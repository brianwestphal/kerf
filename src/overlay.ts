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

/** Content for a {@link toast}: text, `SafeHtml`, or a render function. */
export type ToastContent = string | SafeHtml | (() => MountResult);

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
}

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
 * region (or your `container`). Returns a `() => void` that dismisses it early.
 */
export function toast(content: ToastContent, options: ToastOptions = {}): () => void {
  const { container, className = 'kerf-toast', duration = 4000, role = 'status' } = options;

  const el = document.createElement('div');
  el.className = className;
  el.setAttribute('role', role);
  toastRegion(container).appendChild(el);

  const disposeMount = mount(el, typeof content === 'function' ? content : () => content);
  const state: { dismissed: boolean; timer: ReturnType<typeof setTimeout> | undefined } = {
    dismissed: false,
    timer: undefined,
  };

  function dismiss(): void {
    if (state.dismissed) return;
    state.dismissed = true;
    if (state.timer !== undefined) clearTimeout(state.timer);
    disposeMount();
    el.remove();
  }

  if (duration > 0) state.timer = setTimeout(dismiss, duration);
  return dismiss;
}
