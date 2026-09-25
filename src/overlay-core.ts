/**
 * Internal overlay / popover / tooltip lifecycle implementation.
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
import { jsx, type SafeHtml } from './jsx-runtime.js';
import { mount, type MountResult } from './mount.js';
import {
  type AnchorPositionOptions,
  autoReposition,
  type PopoverPlacement,
  positionAnchored,
} from './overlay-position.js';

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
  /**
   * Opt into the browser **top layer** (`docs/19-native-overlay-backing.md`).
   * When `true` and the engine supports it, a modal overlay (`trap: true`) is
   * hosted in a `<dialog>` opened with `.showModal()` — real inerting of the rest
   * of the document + guaranteed stacking above any `z-index` — and a non-modal
   * one (`trap: false`) uses the Popover API (`[popover]` + `showPopover()`).
   * Feature-detected; falls back to today's plain `<div>` where unsupported.
   *
   * The `render` slot + promise API are unchanged — kerf just hosts your markup
   * in a `<dialog>` / `[popover]` instead of a `<div>`. Two caveats: native
   * `<dialog>` / `[popover]` carry **UA default styles** (a `::backdrop`,
   * centering, border, padding) that kerf does not reset — style the element (and
   * its `::backdrop`) via `className`; and `container` is effectively a **no-op**
   * for visual position, since the top layer ignores where the element lives in
   * the DOM. Default `false`.
   */
  native?: boolean;
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
  'a[href],area[href],button:not([disabled]),input:not([disabled]),' +
  'select:not([disabled]),textarea:not([disabled]),iframe,' +
  '[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

function focusable(root: Element): HTMLElement[] {
  const items = Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE),
  ).filter((el) => !el.hasAttribute('hidden') && el.tabIndex >= 0);
  // WebKit on macOS follows the system's keyboard-navigation preference and
  // may omit implicitly tabbable controls from sequential focus navigation.
  // A focus trap promises stable traversal through every eligible control, so
  // make those implicit stops explicit while preserving authored tabindexes.
  for (const el of items) if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
  return items;
}

// Native top-layer feature detection (KF-526). Modal → `<dialog>.showModal()`;
// non-modal → the Popover API. Each is independent — an engine may ship one
// without the other — and both fall back to the plain `<div>` where absent.
function supportsDialog(): boolean {
  return (
    typeof HTMLDialogElement !== 'undefined' &&
    typeof HTMLDialogElement.prototype.showModal === 'function'
  );
}
function supportsPopover(): boolean {
  return (
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.showPopover === 'function'
  );
}

const FALLBACK_OVERLAY_STACK = Symbol('kerf.fallbackOverlayStack');
type FallbackOverlayDocument = Document & {
  [FALLBACK_OVERLAY_STACK]?: HTMLElement[];
};

function fallbackOverlayStack(wrapper: HTMLElement): HTMLElement[] {
  const document = wrapper.ownerDocument as FallbackOverlayDocument;
  return (document[FALLBACK_OVERLAY_STACK] ??= []);
}

// Validate a string `initialFocus` BEFORE any DOM mutation: `querySelector`
// throws a generic `SyntaxError` DOMException on a malformed selector, and the
// focus pass runs last — after the wrapper, mount, listeners, and stack entry
// already exist — so an unvalidated selector would strand all of them with no
// handle to close. An inert fragment parses the selector without matching.
function assertInitialFocusSelector(selector: string): void {
  try {
    document.createDocumentFragment().querySelector(selector);
  } catch (cause) {
    throw new Error(
      `overlay(): invalid initialFocus selector ${JSON.stringify(selector)}`,
      { cause },
    );
  }
}

/**
 * Open an overlay: append a wrapper to `container`, `mount()` `content` inside
 * it, wire the requested dismissals + (optionally) a focus trap, and return a
 * handle. Concurrent fallback overlays dismiss from the top down. See
 * {@link OverlayOptions}.
 *
 * Construction is transactional: a malformed `initialFocus` selector throws a
 * descriptive error before anything is touched, and if a later setup phase
 * throws (the content's first render, `showModal()` / `showPopover()`), every
 * piece already installed — wrapper node, mount, listeners, fallback-stack
 * entry, top-layer state, moved focus — is rolled back before the original
 * error is rethrown.
 */
export function overlay(
  content: OverlayContent,
  options: OverlayOptions = {},
): OverlayHandle {
  const {
    container = document.body,
    className = 'kerf-overlay',
    dismiss = ['escape', 'backdrop'],
    initialFocus = true,
    trap = true,
    role = 'dialog',
    onDismiss,
    outsideIgnore,
    native = false,
  } = options;

  if (typeof initialFocus === 'string')
    assertInitialFocusSelector(initialFocus);

  const triggers: readonly DismissTrigger[] =
    dismiss === false ? [] : Array.isArray(dismiss) ? dismiss : [dismiss];
  const restoreTo = document.activeElement;

  // Native top-layer backing (KF-526), feature-detected: a modal overlay
  // (`trap`) → `<dialog>.showModal()`; a non-modal one → `[popover]`. Each falls
  // back to the plain `<div>` where the API is missing, so behavior is unchanged
  // on unsupporting engines.
  const useDialog = native && trap && supportsDialog();
  const usePopover = native && !trap && supportsPopover();

  const wrapper: HTMLElement = useDialog
    ? document.createElement('dialog')
    : document.createElement('div');
  wrapper.className = className;
  if (usePopover) wrapper.setAttribute('popover', 'manual');
  // `<dialog>.showModal()` conveys modality natively (role + inert), so the ARIA
  // attributes are only needed on the plain-`<div>` fallback.
  if (trap && !useDialog) {
    wrapper.setAttribute('role', role);
    wrapper.setAttribute('aria-modal', 'true');
  }
  const fallback = !useDialog && !usePopover;
  const fallbackStack = fallback ? fallbackOverlayStack(wrapper) : undefined;

  const isTopmostFallback = (): boolean =>
    fallbackStack === undefined ||
    fallbackStack[fallbackStack.length - 1] === wrapper;

  const removers: Array<() => void> = [];
  const resultBox: { resolve?: (value: unknown) => void } = {};
  const result = new Promise<unknown>((resolve) => {
    resultBox.resolve = resolve;
  });
  const state = { closed: false };
  let disposeMount: (() => void) | undefined;
  let nativeOpened = false;

  // Also the construction rollback (see the transaction below): every step
  // tolerates a phase that never ran — no mount yet, no stack entry, never
  // appended, never shown.
  function close(value?: unknown): void {
    if (state.closed) return;
    state.closed = true;
    if (fallbackStack !== undefined) {
      const stackIndex = fallbackStack.indexOf(wrapper);
      if (stackIndex !== -1) fallbackStack.splice(stackIndex, 1);
    }
    for (const remove of removers) remove();
    disposeMount?.();
    // Exit the top layer before removing the node, so the native close steps run
    // (restore inert, fire the dialog's `close`). `<dialog>` also restores focus
    // itself; kerf's manual restore below stays as the fallback path's behavior.
    if (nativeOpened) {
      nativeOpened = false;
      if (useDialog) (wrapper as HTMLDialogElement).close();
      else (wrapper as HTMLElement & { hidePopover(): void }).hidePopover();
    }
    wrapper.remove();
    if (restoreTo instanceof HTMLElement && restoreTo.isConnected)
      restoreTo.focus();
    resultBox.resolve?.(value);
  }

  function userDismiss(): void {
    onDismiss?.();
    close();
  }

  // One transaction: if any phase below throws (the content's first render,
  // `showModal()` / `showPopover()`, …), roll back whatever the earlier phases
  // installed via `close()` and rethrow the original error. No handle is
  // returned on failure, so nothing may outlive the call.
  try {
    container.appendChild(wrapper);
    disposeMount = mount(
      wrapper,
      typeof content === 'function' ? content : () => content,
    );
    fallbackStack?.push(wrapper);

    // Enter the top layer after the content is mounted + connected.
    // `showModal()` moves focus into the dialog by default; kerf's
    // `initialFocus` pass below runs afterward and wins.
    if (useDialog) {
      (wrapper as HTMLDialogElement).showModal();
      nativeOpened = true;
    } else if (usePopover) {
      (wrapper as HTMLElement & { showPopover(): void }).showPopover();
      nativeOpened = true;
      // Neutralize the UA `[popover] { inset: 0; margin: auto }` anchoring so
      // `positionAnchored` (which sets `top`/`left`) controls placement —
      // otherwise the retained `right`/`bottom` insets would stretch/center it.
      wrapper.style.inset = 'auto';
    }

    installDismissal();
    applyInitialFocus();
  } catch (error) {
    close();
    throw error;
  }

  return { el: wrapper, close, result };

  function installDismissal(): void {
    const wantEscape = triggers.includes('escape');
    if (useDialog) {
      // A native modal `<dialog>` confines Tab focus itself and surfaces Escape as
      // a `cancel` event. Take that over: `preventDefault` so kerf owns teardown
      // (and so Escape is swallowed when it isn't a dismiss trigger), then dismiss.
      const onCancel = (event: Event): void => {
        event.preventDefault();
        if (wantEscape) userDismiss();
      };
      wrapper.addEventListener('cancel', onCancel);
      removers.push(() => wrapper.removeEventListener('cancel', onCancel));
    } else if (wantEscape || trap) {
      const onKeydown = (event: KeyboardEvent): void => {
        if (!isTopmostFallback()) return;
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
      removers.push(() =>
        document.removeEventListener('keydown', onKeydown, true),
      );
    }

    if (triggers.includes('backdrop')) {
      const onClick = (event: Event): void => {
        if (!isTopmostFallback()) return;
        if (event.target === wrapper) userDismiss();
      };
      wrapper.addEventListener('click', onClick);
      removers.push(() => wrapper.removeEventListener('click', onClick));
    }

    if (triggers.includes('outside')) {
      const ignore =
        outsideIgnore === undefined
          ? []
          : Array.isArray(outsideIgnore)
            ? outsideIgnore
            : [outsideIgnore];
      // Capture phase: the click that opened this overlay already passed
      // document's capture phase, so this never fires for that opening click.
      const onDocClick = (event: Event): void => {
        if (!isTopmostFallback()) return;
        const target = event.target as Node | null;
        if (target === null) return;
        if (wrapper.contains(target)) return;
        if (ignore.some((el) => el === target || el.contains(target))) return;
        userDismiss();
      };
      document.addEventListener('click', onDocClick, true);
      removers.push(() =>
        document.removeEventListener('click', onDocClick, true),
      );
    }
  }

  function applyInitialFocus(): void {
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
  }
}

/**
 * Internal: run a promise-dialog helper's post-open wiring (required-slot
 * lookups, `delegate()` handlers, key listeners) as the tail of `overlay()`'s
 * construction transaction. `wire` registers a disposer for every listener it
 * installs via `track`; if any step throws, those listeners are removed, the
 * just-opened overlay is closed (node, mount, dismissal listeners, stack
 * entry, top-layer state, focus), and the original error is rethrown — so a
 * failed helper call returns no promise and leaves no open overlay behind.
 *
 * After construction, `guard` wraps a user-action handler (OK click, Enter).
 * KF-B0CFQP (a throwing `validate` callback): a throw inside a guarded action
 * is a programming error, so it closes the dialog (full teardown, focus
 * restored) and the returned promise REJECTS with the original error, instead
 * of the error escaping the event handler and stranding an open dialog whose
 * OK can never succeed. Otherwise the returned promise settles with
 * `settle(handle.result's value)`. Not re-exported from `kerfjs/overlay`.
 */
export function wireDialog<T>(
  handle: OverlayHandle,
  wire: (
    track: (dispose: () => void) => void,
    guard: (action: () => void) => () => void,
  ) => void,
  settle: (value: unknown) => T,
): Promise<T> {
  const disposers: Array<() => void> = [];
  // Holds a guarded action's error AND is the close() value that marks the
  // failure, so only a throw that actually settles the dialog rejects it.
  const failure: unknown[] = [];
  try {
    wire(
      (dispose) => void disposers.push(dispose),
      (action) => () => {
        try {
          action();
        } catch (error) {
          failure[0] = error;
          handle.close(failure);
        }
      },
    );
  } catch (error) {
    disposers.forEach((dispose) => dispose());
    handle.close();
    throw error;
  }
  // One hop, not a chain: `settle` maps the value in the same reaction, so a
  // helper's promise settles as soon after `close()` as it always has.
  return handle.result.then((value) => {
    if (value === failure) throw failure[0];
    return settle(value);
  });
}

// The anchored-positioning primitives — `positionAnchored` / `autoReposition`
// plus their option types — live in `./overlay-position.ts` (KF-511) since they
// stand alone (any element, no overlay lifecycle). Re-exported here so the
// `kerfjs/overlay` surface is unchanged; `popover()` / `tooltip()` below build on
// `autoReposition` (imported above).
export {
  type AnchorPositionOptions,
  autoReposition,
  type PopoverPlacement,
  positionAnchored,
};

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
  /**
   * Host the popover in the browser top layer (the Popover API — `[popover]` +
   * `showPopover()`) where supported, so it stacks above any `z-index` without a
   * z-index war. Falls back to today's plain `<div>` where unsupported. kerf keeps
   * owning positioning + its own dismiss wiring; the popover is `popover="manual"`.
   * See {@link OverlayOptions.native}. Default `false`.
   */
  native?: boolean;
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
    native = false,
  } = options;

  const extraIgnore =
    outsideIgnore === undefined
      ? []
      : Array.isArray(outsideIgnore)
        ? [...outsideIgnore]
        : [outsideIgnore];

  const handle = overlay(content, {
    container,
    className,
    dismiss,
    trap: false,
    initialFocus,
    onDismiss,
    outsideIgnore: [anchor, ...extraIgnore],
    native,
  });

  // Position + keep it glued while open; drop the listeners on close. A throw
  // while positioning (e.g. an anchor whose geometry read fails) is still part
  // of construction: close the just-opened overlay before rethrowing.
  let stopReposition: () => void;
  try {
    stopReposition = autoReposition(handle.el, anchor, {
      placement,
      align,
      gap,
    });
  } catch (error) {
    handle.close();
    throw error;
  }
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
  /** Host the tooltip in the browser top layer (the Popover API) where supported. See {@link OverlayOptions.native}. Default `false`. */
  native?: boolean;
}

/**
 * A hover/focus-triggered, non-modal, auto-hiding tooltip anchored to `anchor`.
 * Shows after `delay` on `pointerenter`/`focus`, hides after `hideDelay` on
 * `pointerleave`/`blur`, and positions itself with {@link autoReposition} (above
 * the anchor by default). Unlike {@link popover} there is no click-dismiss model —
 * it follows the pointer/focus. Returns a disposer that removes the anchor
 * listeners and hides any shown tooltip. Structural only (kerf ships no CSS).
 */
export function tooltip(
  anchor: Element,
  content: TooltipContent,
  options: TooltipOptions = {},
): () => void {
  const {
    container,
    className = 'kerf-tooltip',
    delay = 400,
    hideDelay = 100,
    role = 'tooltip',
    placement = 'top',
    align = 'start',
    gap = 4,
    native = false,
  } = options;

  const body: OverlayContent =
    typeof content === 'function'
      ? content
      : typeof content === 'string'
        ? jsx('span', { class: `${className}__text`, children: content })
        : content;

  const timers: {
    show?: ReturnType<typeof setTimeout>;
    hide?: ReturnType<typeof setTimeout>;
  } = {};
  let current: { handle: OverlayHandle; stop: () => void } | undefined;
  let presence = 0;

  // Runs from the `delay` timer, so there is no caller to throw to. A failed
  // show (a throwing render fn, `native` `showPopover()`, or positioning) is
  // rolled back before `current` is set — nothing stays on screen and the
  // next pointerenter / focus schedules a fresh attempt — and the original
  // error then escapes the timer callback for the host to report as uncaught
  // (a window `error` event in browsers), the same way kerf's other deferred
  // callbacks (debounce / throttle timers, attach teardown) surface errors.
  function show(): void {
    const handle = overlay(body, {
      container,
      className,
      dismiss: false,
      trap: false,
      initialFocus: false,
      native,
    });
    handle.el.setAttribute('role', role);
    let stop: () => void;
    try {
      stop = autoReposition(handle.el, anchor, { placement, align, gap });
    } catch (error) {
      // Not yet tracked in `current`, so `hide()` could never reach it.
      handle.close();
      throw error;
    }
    current = { handle, stop };
  }

  function hide(): void {
    if (current === undefined) return;
    current.stop();
    current.handle.close();
    current = undefined;
  }

  const onEnter = (event: Event): void => {
    presence |= event.type === 'focus' ? 2 : 1;
    if (timers.hide !== undefined) clearTimeout(timers.hide);
    if (current !== undefined) return;
    if (timers.show !== undefined) clearTimeout(timers.show); // debounce: one pending show at a time
    timers.show = setTimeout(show, delay);
  };
  const onLeave = (event: Event): void => {
    presence &= event.type === 'blur' ? ~2 : ~1;
    if (presence) return;
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
