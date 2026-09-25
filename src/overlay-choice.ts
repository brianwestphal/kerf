/** `choice()` implementation and public option types. */
import { delegate } from './delegate.js';
import { jsx } from './jsx-runtime.js';
import { overlay, type OverlayContent, wireDialog } from './overlay-core.js';

/** One choosable action in a {@link choice} dialog. */
export interface ChoiceAction<R> {
  value: R;
  label: string;
  className?: string;
}

/** Wiring slots for a {@link ChoiceOptions.render}. */
export interface ChoiceRenderSlots {
  message: string;
  actions: Array<Record<string, string>>;
}

/** Options for {@link choice}. */
export interface ChoiceOptions<R> {
  container?: Element;
  className?: string;
  title?: string;
  defaultValue?: R;
  native?: boolean;
  render?: (slots: ChoiceRenderSlots) => OverlayContent;
}

/** The N-way sibling of {@link confirm}. */
export function choice<R>(
  message: string,
  actions: ReadonlyArray<ChoiceAction<R>>,
  options: ChoiceOptions<R> = {},
): Promise<R | null> {
  const {
    container,
    className = 'kerf-overlay',
    title,
    defaultValue,
    native = false,
    render,
  } = options;
  const hasDefault = 'defaultValue' in options;
  const actionAttrs = actions.map((_, i) => ({ 'data-choice': String(i) }));

  const body: OverlayContent =
    render !== undefined
      ? render({ message, actions: actionAttrs })
      : jsx('div', {
          class: 'kerf-choice',
          children: [
            title !== undefined
              ? jsx('h2', { class: 'kerf-choice__title', children: title })
              : '',
            jsx('p', { class: 'kerf-choice__message', children: message }),
            jsx('div', {
              class: 'kerf-choice__actions',
              children: actions.map((action, i) =>
                jsx('button', {
                  type: 'button',
                  class:
                    action.className !== undefined
                      ? `kerf-choice__action ${action.className}`
                      : 'kerf-choice__action',
                  ...actionAttrs[i],
                  children: action.label,
                }),
              ),
            }),
          ],
        });

  let resolveChoice!: (result: R | null) => void;
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

  // Post-open wiring is still construction: a throw closes the overlay. Any
  // close settles a still-pending choice as a dismissal (`null`).
  void wireDialog(
    handle,
    (track) => {
      track(
        delegate(handle.el, 'click', '[data-choice]', (_event, el) => {
          resolveChoice(actions[Number(el.getAttribute('data-choice'))].value);
          handle.close();
        }),
      );

      if (hasDefault) {
        const onKeydown = (event: KeyboardEvent): void => {
          if (event.key === 'Enter') {
            event.preventDefault();
            resolveChoice(defaultValue as R);
            handle.close();
          }
        };
        // Last wiring step: nothing after it can throw, so it needs no rollback.
        handle.el.addEventListener('keydown', onKeydown);
      }
    },
    () => resolveChoice(null),
  );
  return result;
}
