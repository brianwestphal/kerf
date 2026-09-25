/** `confirm()` implementation and public option types. */
import { delegate } from './delegate.js';
import { jsx } from './jsx-runtime.js';
import { overlay, type OverlayContent, wireDialog } from './overlay-core.js';

/** Wiring slots passed to a {@link ConfirmOptions.render}. */
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
  /** Host the dialog in the browser top layer where supported. */
  native?: boolean;
  /** Bring your own body while retaining kerf's dialog wiring. */
  render?: (slots: ConfirmRenderSlots) => OverlayContent;
}

/** A promise-based `window.confirm` replacement. */
export function confirm(
  message: string,
  options: ConfirmOptions = {},
): Promise<boolean> {
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

  const body: OverlayContent =
    render !== undefined
      ? render({
          message,
          ok: { 'data-confirm': 'ok' },
          cancel: { 'data-confirm': 'cancel' },
        })
      : jsx('div', {
          class: 'kerf-confirm',
          children: [
            title !== undefined
              ? jsx('h2', { class: 'kerf-confirm__title', children: title })
              : '',
            jsx('p', { class: 'kerf-confirm__message', children: message }),
            jsx('div', {
              class: 'kerf-confirm__actions',
              children: [
                jsx('button', {
                  type: 'button',
                  'data-confirm': 'cancel',
                  children: cancelText,
                }),
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

  // Post-open wiring is still construction: a throw closes the overlay. The
  // click table is the only (and so the last) step, so it needs no rollback.
  wireDialog(handle, () => {
    delegate(handle.el, 'click', '[data-confirm]', (_event, el) => {
      handle.close(el.getAttribute('data-confirm') === 'ok');
    });
  });

  return handle.result.then((value) => value === true);
}
