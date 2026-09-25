/** `form()` implementation and public option types. */
import { delegate } from './delegate.js';
import { jsx } from './jsx-runtime.js';
import { overlay, type OverlayContent, wireDialog } from './overlay-core.js';
import type { FieldValidator } from './overlay-prompt.js';

/** A single field in a {@link form}. */
export interface FormField {
  name: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  validate?: FieldValidator;
}

/** One field's wiring in a {@link FormRenderSlots}. */
export interface FormRenderField {
  name: string;
  label: string;
  input: Record<string, string>;
  error: Record<string, string>;
}

/** Wiring slots for a {@link FormOptions.render}. */
export interface FormRenderSlots {
  fields: FormRenderField[];
  ok: Record<string, string>;
  cancel: Record<string, string>;
}

/** Options for {@link form}. */
export interface FormOptions {
  container?: Element;
  className?: string;
  title?: string;
  okText?: string;
  cancelText?: string;
  native?: boolean;
  render?: (slots: FormRenderSlots) => OverlayContent;
}

/** A promise-based multi-field dialog. */
export function form(
  fields: readonly FormField[],
  options: FormOptions = {},
): Promise<Record<string, string> | null> {
  const {
    container,
    className = 'kerf-overlay',
    title,
    okText = 'OK',
    cancelText = 'Cancel',
    native = false,
    render,
  } = options;

  const fieldAttrs = (field: FormField): Record<string, string> => ({
    'data-field': field.name,
    name: field.name,
    type: field.type ?? 'text',
    value: field.defaultValue ?? '',
    ...(field.placeholder !== undefined
      ? { placeholder: field.placeholder }
      : {}),
  });

  const body: OverlayContent =
    render !== undefined
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
            title !== undefined
              ? jsx('h2', { class: 'kerf-form__title', children: title })
              : '',
            ...fields.map((field) =>
              jsx('div', {
                class: 'kerf-form__field',
                children: [
                  jsx('label', {
                    class: 'kerf-form__label',
                    children: field.label ?? field.name,
                  }),
                  jsx('input', {
                    class: 'kerf-form__input',
                    ...fieldAttrs(field),
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
                jsx('button', {
                  type: 'button',
                  'data-form': 'cancel',
                  children: cancelText,
                }),
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

  // Post-open wiring is still construction: a missing required field input or
  // any other throw below removes what was wired, closes the overlay, and
  // rethrows.
  wireDialog(handle, (track) => {
    const errorFor = (name: string): HTMLElement | null =>
      Array.from(
        handle.el.querySelectorAll<HTMLElement>('[data-field-error]'),
      ).find((el) => el.getAttribute('data-field-error') === name) ?? null;
    const inputFor = (name: string): HTMLInputElement => {
      const input = Array.from(
        handle.el.querySelectorAll<HTMLInputElement>('input[data-field]'),
      ).find((el) => el.getAttribute('data-field') === name);
      if (input !== undefined) return input;
      handle.close(null);
      throw new Error(`form(): render missing <input data-field="${name}">.`);
    };

    for (const field of fields) {
      inputFor(field.name);
      const errorEl = errorFor(field.name);
      if (errorEl !== null) errorEl.hidden = true;
    }

    const attemptOk = (): void => {
      const record: Record<string, string> = {};
      let firstInvalid: HTMLInputElement | null = null;
      for (const field of fields) {
        const el = inputFor(field.name);
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
    };

    track(
      delegate(handle.el, 'click', '[data-form]', (_event, el) => {
        if (el.getAttribute('data-form') === 'ok') attemptOk();
        else handle.close(null);
      }),
    );

    const onKeydown = (event: KeyboardEvent): void => {
      if (
        event.key === 'Enter' &&
        (event.target as Element | null)?.matches('[data-field]')
      ) {
        event.preventDefault();
        attemptOk();
      }
    };
    // Last wiring step: nothing after it can throw, so it needs no rollback.
    handle.el.addEventListener('keydown', onKeydown);
  });

  return handle.result.then((value) =>
    value !== null && typeof value === 'object'
      ? (value as Record<string, string>)
      : null,
  );
}
