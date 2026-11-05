type ActivationModifiers = Pick<
  KeyboardEvent,
  'shiftKey' | 'ctrlKey' | 'metaKey'
>;

/**
 * Activate an item with a click that carries the activating key's modifier
 * state, so one delegated click handler serves pointer and keyboard
 * multi-selection alike (Shift extends a range, Cmd/Ctrl toggles one item).
 */
function activate(item: HTMLElement, modifiers: ActivationModifiers) {
  item.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: item.ownerDocument.defaultView,
      shiftKey: modifiers.shiftKey,
      ctrlKey: modifiers.ctrlKey,
      metaKey: modifiers.metaKey,
    }),
  );
}

/** Native-like Enter/Space activation for a focusable, non-button item. */
export interface KeyActivation {
  /**
   * Handle Enter (activates now) or Space (activates on release); returns
   * whether the key was one of them. The caller has already checked that the
   * event is not `defaultPrevented` and resolved `item`.
   */
  keydown(event: KeyboardEvent, item: HTMLElement): boolean;
  keyup(event: KeyboardEvent): void;
  focusout(event: FocusEvent): void;
  /** Cancel a pending Space press. */
  clear(): void;
}

/**
 * Enter activates on press; Space marks the item `data-kui-pressed` and
 * activates on release only if the release resolves to the same, still
 * focused item. The activation click mirrors the Shift, Ctrl, and Meta state
 * of the activating key (Space uses the state at press). `resolve` maps a
 * keyup back to its item, or `null`.
 */
export function createKeyActivation(
  resolve: (event: Event) => HTMLElement | null,
): KeyActivation {
  let pendingSpace: {
    item: HTMLElement;
    modifiers: ActivationModifiers;
  } | null = null;

  const clear = () => {
    pendingSpace?.item.removeAttribute('data-kui-pressed');
    pendingSpace = null;
  };

  return {
    keydown(event, item) {
      if (event.key === 'Enter') {
        event.preventDefault();
        activate(item, event);
        return true;
      }
      if (event.key !== ' ' && event.key !== 'Spacebar') return false;
      event.preventDefault();
      if (event.repeat) return true;
      clear();
      pendingSpace = {
        item,
        modifiers: {
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
        },
      };
      item.setAttribute('data-kui-pressed', 'true');
      return true;
    },
    keyup(event) {
      if (event.key !== ' ' && event.key !== 'Spacebar') return;
      if (!pendingSpace) return;
      const { item, modifiers } = pendingSpace;
      event.preventDefault();
      clear();
      if (item === resolve(event) && item.ownerDocument.activeElement === item)
        activate(item, modifiers);
    },
    focusout(event) {
      if (event.target === pendingSpace?.item) clear();
    },
    clear,
  };
}
