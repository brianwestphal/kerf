/** Hover and focus tooltip lifecycle built on the shared overlay transaction. */
import { attach } from './attach.js';
import { jsx, type SafeHtml } from './jsx-runtime.js';
import type { MountResult } from './mount.js';
import {
  overlay,
  type OverlayContent,
  type OverlayHandle,
  overlayHost,
} from './overlay-core.js';
import {
  type AnchorPositionOptions,
  autoReposition,
} from './overlay-position.js';

/** Content for a {@link tooltip}: text (auto-escaped), `SafeHtml`, or a render function. */
export type TooltipContent = string | SafeHtml | (() => MountResult);

/** Options for {@link tooltip}. */
export interface TooltipOptions extends AnchorPositionOptions {
  /** Where to append the tooltip wrapper. Default: the anchor's modal-dialog host slot (see {@link PopoverOptions.container}), else `document.body`. */
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
  let current:
    | { handle: OverlayHandle; stop: () => void; unwatch: () => void }
    | undefined;
  let presence = 0;

  // Runs from the `delay` timer, so there is no caller to throw to. A failed
  // show (a throwing render fn, `native` `showPopover()`, or positioning) is
  // rolled back before `current` is set — nothing stays on screen and the
  // next pointerenter / focus schedules a fresh attempt — and the original
  // error then escapes the timer callback for the host to report as uncaught
  // (a window `error` event in browsers), the same way kerf's other deferred
  // callbacks (debounce / throttle timers, attach teardown) surface errors.
  function show(): void {
    // The anchor left the document while the show was pending (KF-BAVCEV).
    if (!anchor.isConnected) return;
    const handle = overlay(body, {
      container: container ?? overlayHost(anchor),
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
    // KF-BAVCEV: an anchor removed from the document (e.g. with the modal that
    // held it) fires no pointerleave / blur, so hide when it leaves and forget
    // its presence; a move within the document keeps the tooltip shown.
    const unwatch = attach(anchor, () => () => {
      presence = 0;
      if (timers.hide !== undefined) clearTimeout(timers.hide);
      hide();
    });
    current = { handle, stop, unwatch };
    // A surface that closed itself (its host slot left the document with the
    // dialog) must not stay `current`, or the next hover would never show.
    void handle.result.then(() => {
      if (current?.handle === handle) hide();
    });
  }

  function hide(): void {
    const shown = current;
    if (shown === undefined) return;
    // Cleared first: `unwatch()` runs the anchor teardown, which re-enters here.
    current = undefined;
    shown.unwatch();
    shown.stop();
    shown.handle.close();
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
