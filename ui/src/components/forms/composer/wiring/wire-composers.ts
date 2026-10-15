type Root = HTMLElement | Document;

const COMPOSER = '[data-component="composer"]';
const ACTION = 'wa-button, button, [data-action]';

/** IME keydowns report keyCode 229 (WebKit sends it after compositionend). */
const IME_KEY_CODE = 229;

function composerFieldOf(
  target: EventTarget | null,
): HTMLTextAreaElement | null {
  if (
    !(target instanceof HTMLTextAreaElement) ||
    !target.classList.contains('kui-composer__field')
  )
    return null;
  const composer = target.closest<HTMLElement>(COMPOSER);
  return composer?.dataset.submitOnEnter === 'true' ? target : null;
}

function isUnavailable(action: Element): boolean {
  return (
    action.hasAttribute('disabled') ||
    action.hasAttribute('loading') ||
    action.getAttribute('aria-busy') === 'true' ||
    action.getAttribute('aria-disabled') === 'true' ||
    (action as Element & { disabled?: unknown }).disabled === true
  );
}

/**
 * Enter-to-send for every `Composer` rendered with `submitOnEnter` below
 * root. In its field, Enter (alone or with Cmd or Ctrl) activates the
 * composer's first trailing action, so a keyboard send runs the same
 * delegated handler as a click. Shift+Enter and Alt+Enter insert a newline.
 * Nothing is sent, and no newline is inserted, when the message is empty or
 * whitespace-only, the key is auto-repeating, or the first action is
 * disabled, loading (a busy `Button` reports `aria-busy`), or
 * `aria-disabled`. An Enter that commits an IME
 * composition (`isComposing`, keyCode 229, or between `compositionstart` and
 * `compositionend`) is left to the input method. Dispose with the owning
 * application.
 */
export function wireComposers(root: Root): () => void {
  const composing = new WeakSet<HTMLTextAreaElement>();
  const onCompositionStart = (event: Event) => {
    const field = composerFieldOf(event.target);
    if (field) composing.add(field);
  };
  const onCompositionEnd = (event: Event) => {
    const field = composerFieldOf(event.target);
    if (field) composing.delete(field);
  };
  const onKeyDown = (event: Event) => {
    const key = event as KeyboardEvent;
    if (key.key !== 'Enter' || key.shiftKey || key.altKey) return;
    const field = composerFieldOf(key.target);
    if (!field || field.disabled) return;
    if (key.isComposing || key.keyCode === IME_KEY_CODE || composing.has(field))
      return;
    key.preventDefault();
    if (key.repeat || field.value.trim() === '') return;
    // composerFieldOf found the field inside a composer.
    const action = field
      .closest(COMPOSER)!
      .querySelector('.kui-composer__trailing')
      ?.querySelector<HTMLElement>(ACTION);
    if (!action || isUnavailable(action)) return;
    action.click();
  };
  root.addEventListener('compositionstart', onCompositionStart);
  root.addEventListener('compositionend', onCompositionEnd);
  root.addEventListener('keydown', onKeyDown);
  return () => {
    root.removeEventListener('compositionstart', onCompositionStart);
    root.removeEventListener('compositionend', onCompositionEnd);
    root.removeEventListener('keydown', onKeyDown);
  };
}
