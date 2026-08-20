/**
 * `toast()` for `kerfjs/overlay` — a non-modal, auto-dismissing notification that
 * stacks in a shared body-level region. Split out of `overlay.ts` (KF-513) since
 * it's a distinct transient-UI concern from the modal dialogs; re-exported from
 * `overlay.ts` so the public `kerfjs/overlay` surface is unchanged. Structural
 * only — kerf ships no CSS; you style the region / toast / animations.
 */
import { type SafeHtml } from './jsx-runtime.js';
import { mount, type MountResult } from './mount.js';

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
  /**
   * How `mode: 'replace'` drops the prior toast(s): `'fade'` (default) runs their
   * full exit transition (nice for a STACKING region), or `'instant'` removes them
   * synchronously with no exit — what a single, exactly-centered toast slot wants,
   * so the outgoing and incoming messages never cross-fade in the same spot.
   */
  collapse?: 'fade' | 'instant';
  /** Accent variant — adds a `${className}--${variant}` class (kerf ships no CSS; you style it). */
  variant?: ToastVariant;
  /** Class added on the next animation frame after mount, so a CSS **entrance** transition can run. */
  enterClass?: string;
  /**
   * Class added when dismissing, so CSS owns the **exit**. On dismiss the
   * `enterClass` (if any) is also REMOVED, so `exitClass` doesn't have to
   * out-specify it — and a symmetric single-class fade (entrance = add
   * `enterClass`, exit = remove it) works by setting only `enterClass` +
   * `exitDuration`. The node is removed `exitDuration` ms later.
   */
  exitClass?: string;
  /** ms to wait before removing the node on dismiss — applies when `exitClass` is set OR when it's > 0 (to let a removed `enterClass` transition out). Default `0`. */
  exitDuration?: number;
}

/** Handle returned by {@link toast}. */
export interface ToastHandle {
  /** The toast element — inspect it, or run your own entrance/exit transitions. */
  el: HTMLElement;
  /**
   * Dismiss it early. Default runs the `exitClass` transition (removed after
   * `exitDuration`); pass `{ instant: true }` to remove it **synchronously** with
   * no exit — for an action button that immediately shows a replacement toast in a
   * single centered slot (no cross-fade). Idempotent.
   */
  dismiss(options?: { instant?: boolean }): void;
}

/** The region's active toasts live on the region element (in the DOM), not in module state. */
const TOAST_SET = Symbol('kerf.toasts');
/** A dismiss function with an `.removeNow()` for instant (no-exit) teardown. */
type Dismisser = (() => void) & { removeNow: () => void };
type ToastCarrier = Element & { [TOAST_SET]?: Set<Dismisser> };

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
    collapse = 'fade',
    variant,
    enterClass,
    exitClass,
    exitDuration = 0,
  } = options;

  const region = toastRegion(container) as ToastCarrier;
  const active = (region[TOAST_SET] ??= new Set<Dismisser>());
  // collapse-to-latest: 'instant' removes priors synchronously (no cross-fade in a
  // centered single slot); 'fade' runs their exit transition (nice for a stack).
  if (mode === 'replace') {
    for (const d of [...active]) {
      if (collapse === 'instant') d.removeNow();
      else d();
    }
  }

  const el = document.createElement('div');
  el.className = className;
  if (variant !== undefined) el.classList.add(`${className}--${variant}`);
  el.setAttribute('role', role);
  region.appendChild(el);

  const disposeMount = mount(el, typeof content === 'function' ? content : () => content);
  const state: {
    dismissed: boolean;
    removed: boolean;
    timer: ReturnType<typeof setTimeout> | undefined;
    exitTimer: ReturnType<typeof setTimeout> | undefined;
  } = { dismissed: false, removed: false, timer: undefined, exitTimer: undefined };

  if (enterClass !== undefined) {
    globalThis.requestAnimationFrame(() => {
      if (!state.dismissed) el.classList.add(enterClass);
    });
  }

  const remove = (): void => {
    if (state.removed) return;
    state.removed = true;
    state.dismissed = true; // once removed, a later dismiss() is a clean no-op
    if (state.exitTimer !== undefined) clearTimeout(state.exitTimer);
    disposeMount();
    el.remove();
    active.delete(dismiss as Dismisser);
  };

  // Force synchronous teardown NOW, with no exit transition — even if a fade is
  // already in flight (so `mode:'replace'` collapse can clean up a mid-exit toast,
  // and `dismiss({ instant: true })` drops it immediately).
  const removeNow = (): void => {
    if (state.timer !== undefined) clearTimeout(state.timer);
    remove();
  };

  const fadeOut = (): void => {
    if (state.dismissed) return;
    state.dismissed = true;
    if (state.timer !== undefined) clearTimeout(state.timer);
    // Reverse the entrance (drop enterClass so exitClass needn't out-specify it),
    // add exitClass, and delay removal for the transition — including the
    // single-class idiom (enterClass removed + exitDuration, no exitClass).
    if (enterClass !== undefined) el.classList.remove(enterClass);
    if (exitClass !== undefined) el.classList.add(exitClass);
    if (exitClass !== undefined || exitDuration > 0) {
      state.exitTimer = setTimeout(remove, exitDuration);
    } else {
      remove();
    }
  };

  function dismiss(options?: { instant?: boolean }): void {
    if (options?.instant === true) removeNow();
    else fadeOut();
  }
  (dismiss as Dismisser).removeNow = removeNow;

  active.add(dismiss as Dismisser);
  if (duration > 0) state.timer = setTimeout(fadeOut, duration);
  return { el, dismiss };
}
