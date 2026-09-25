/** `prompt()` implementation and public option types. */
import { delegate } from './delegate.js';
import { jsx } from './jsx-runtime.js';
import { overlay, type OverlayContent, wireDialog } from './overlay-core.js';

/**
 * Validate a single field's value, synchronously: return a non-empty message
 * to block OK, anything else to accept. A validator that throws is treated as
 * a programming error — the dialog closes and the returned promise rejects
 * with that error.
 */
export type FieldValidator = (
  value: string,
) => string | null | undefined | void;

/** Options for {@link prompt}. */
/**
 * Run a {@link FieldValidator}: the message it reports, or `undefined` when the
 * value is valid. Validators are synchronous — a promise result is a
 * programming error that closes the dialog and rejects its promise (the stray
 * promise's own rejection is silenced so it is not reported twice).
 * Internal to the dialog helpers.
 */
export function runValidator(
  validate: FieldValidator | undefined,
  value: string,
  owner: string,
): string | undefined {
  const result: unknown = validate?.(value);
  if (typeof (result as PromiseLike<unknown> | null)?.then === 'function') {
    (result as PromiseLike<unknown>).then(undefined, () => undefined);
    throw new TypeError(`${owner}: validate returned a promise.`);
  }
  return typeof result === 'string' && result.length > 0 ? result : undefined;
}

export interface PromptOptions {
  container?: Element;
  className?: string;
  title?: string;
  defaultValue?: string;
  placeholder?: string;
  inputType?: string;
  okText?: string;
  cancelText?: string;
  validate?: FieldValidator;
  native?: boolean;
  render?: (slots: PromptRenderSlots) => OverlayContent;
}

/** Wiring slots for a {@link PromptOptions.render}. */
export interface PromptRenderSlots {
  message: string;
  input: Record<string, string>;
  error: Record<string, string>;
  ok: Record<string, string>;
  cancel: Record<string, string>;
}

/** A promise-based `window.prompt` replacement. */
export function prompt(
  message: string,
  options: PromptOptions = {},
): Promise<string | null> {
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

  const body: OverlayContent =
    render !== undefined
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
            title !== undefined
              ? jsx('h2', { class: 'kerf-prompt__title', children: title })
              : '',
            jsx('label', { class: 'kerf-prompt__message', children: message }),
            jsx('input', { class: 'kerf-prompt__input', ...inputAttrs }),
            jsx('p', {
              class: 'kerf-prompt__error',
              'data-prompt-error': '',
              children: '',
            }),
            jsx('div', {
              class: 'kerf-prompt__actions',
              children: [
                jsx('button', {
                  type: 'button',
                  'data-prompt': 'cancel',
                  children: cancelText,
                }),
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

  // Post-open wiring is still construction: a missing required input or any
  // other throw below removes what was wired, closes the overlay, and rethrows.
  return wireDialog(
    handle,
    (track, guard) => {
      // Looked up again at OK: a reactive re-render may have replaced the
      // input, and a detached node would report a stale value. Missing at
      // construction is a render bug (rolls back, throws); missing at OK
      // rejects the promise through `guard`.
      const inputFor = (problem = 'render missing'): HTMLInputElement => {
        const input = handle.el.querySelector<HTMLInputElement>(
          'input[data-prompt-input]',
        );
        if (input !== null) return input;
        throw new Error(`prompt(): ${problem} <input data-prompt-input>.`);
      };
      inputFor();
      const errorEl = handle.el.querySelector<HTMLElement>(
        '[data-prompt-error]',
      );
      if (errorEl !== null) errorEl.hidden = true;

      // A throwing (or promise-returning) `validate` closes the dialog and
      // rejects the promise (guard).
      const attemptOk = guard((): void => {
        const input = inputFor('removed after open:');
        const value = input.value;
        const error = runValidator(validate, value, 'prompt()');
        if (error !== undefined) {
          if (errorEl !== null) {
            errorEl.textContent = error;
            errorEl.hidden = false;
          }
          input.focus();
          return;
        }
        handle.close(value);
      });

      track(
        delegate(handle.el, 'click', '[data-prompt]', (_event, el) => {
          if (el.getAttribute('data-prompt') === 'ok') attemptOk();
          else handle.close(null);
        }),
      );

      const onKeydown = (event: KeyboardEvent): void => {
        if (
          event.key === 'Enter' &&
          (event.target as Element | null)?.matches('input[data-prompt-input]')
        ) {
          event.preventDefault();
          attemptOk();
        }
      };
      // Last wiring step: nothing after it can throw, so it needs no rollback.
      handle.el.addEventListener('keydown', onKeydown);
    },
    (value) => (typeof value === 'string' ? value : null),
  );
}
