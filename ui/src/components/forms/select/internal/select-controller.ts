import {
  followAnchor,
  positionPopup,
} from '../../../../shared/popup/position-popup.js';
import {
  chosenOptions,
  KuiSelectElement,
  optionsOf,
  optionValue,
  setChosen,
} from './select-element.js';

const ROOT = 'kui-select.kui-select';
const TRIGGER = '.kui-select__trigger';
const POPUP = '.kui-select__popup';

/** A typeahead query resets after this long without a keystroke. */
export const SELECT_TYPEAHEAD_RESET = 1000;

const isOpen = (popup: Element): boolean => popup.matches(':popover-open');

const isDisabled = (option: Element): boolean =>
  option.getAttribute('aria-disabled') === 'true';

const triggerOf = (root: Element): HTMLButtonElement =>
  root.querySelector<HTMLButtonElement>(`:scope > ${TRIGGER}`)!;

const popupOf = (root: Element): HTMLElement =>
  root.querySelector<HTMLElement>(`:scope > ${POPUP}`)!;

const labelOf = (option: Element): string =>
  option.querySelector('.kui-select__option-label')!.textContent.trim();

/** Scroll the popup by the least amount that shows `option` whole. */
function reveal(option: HTMLElement, popup: HTMLElement): void {
  if (popup.scrollHeight <= popup.clientHeight) return;
  const box = option.getBoundingClientRect();
  const top = popup.getBoundingClientRect().top + popup.clientTop;
  const bottom = top + popup.clientHeight;
  if (box.top < top) popup.scrollTop -= top - box.top;
  else if (box.bottom > bottom) popup.scrollTop += box.bottom - bottom;
}

const installed = new WeakSet<Document>();

/**
 * Wire every Select in `doc` and define its `kui-select` root element:
 * opening from the trigger (pointer, Enter, Space, the arrows, or typing),
 * top-layer placement below the trigger (flipping above when short), roving
 * focus through the options with typeahead, choosing (a single Select closes
 * and returns focus; a multiple one toggles and stays open), the opt-in
 * select-all and clear actions, `input` and `change` from the root, and
 * dismissal by Escape, Tab, or a press outside. Idempotent per document.
 */
export function installSelects(doc: Document = document): void {
  if (installed.has(doc)) return;
  installed.add(doc);
  const win = doc.defaultView!;
  if (!win.customElements.get('kui-select'))
    win.customElements.define('kui-select', KuiSelectElement);
  const following = new WeakMap<HTMLElement, () => void>();
  const openRoots = new Set<HTMLElement>();
  const typeahead = new WeakMap<
    HTMLElement,
    { query: string; timer: number | undefined }
  >();

  // Stop placing a closed Select's listbox and reset its open state.
  const reset = (popup: HTMLElement) => {
    following.get(popup)?.();
    following.delete(popup);
    const root = popup.parentElement!;
    openRoots.delete(root);
    root.removeAttribute('open');
    triggerOf(root).setAttribute('aria-expanded', 'false');
  };

  const announce = (root: HTMLElement) => {
    (root as Partial<KuiSelectElement>).syncFormValue?.();
    root.dispatchEvent(
      new InputEvent('input', { bubbles: true, composed: true }),
    );
    root.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };

  const focusOption = (root: HTMLElement, option: HTMLElement | undefined) => {
    const popup = popupOf(root);
    // A listbox with no options still takes focus, so its keys work.
    (option ?? popup).focus({ preventScroll: true });
    if (option) reveal(option, popup);
  };

  const open = (root: HTMLElement, focus: 'chosen' | 'first' | 'last') => {
    const trigger = triggerOf(root);
    const popup = popupOf(root);
    if (trigger.disabled || isOpen(popup)) return;
    popup.showPopover();
    openRoots.add(root);
    root.setAttribute('open', '');
    trigger.setAttribute('aria-expanded', 'true');
    const fit = root.classList.contains('kui-select--fit-menu');
    const place = async () => {
      // Removing an open popover hides it without a toggle event.
      if (!popup.isConnected || !isOpen(popup)) {
        reset(popup);
        return;
      }
      // `fitMenu` matches the trigger; otherwise the listbox takes its
      // content's width within its cap.
      if (fit) popup.style.width = `${trigger.getBoundingClientRect().width}px`;
      await positionPopup(trigger, popup, { placement: 'bottom' });
    };
    const stopFollowing = followAnchor(trigger, popup, () => void place());
    // An application re-render while the listbox is open morphs the trigger
    // and popup back to their rendered (closed) attributes; restore the open
    // state and placement.
    let replacing = false;
    const restore = new MutationObserver(() => {
      // A Select disabled while open closes, so nothing more can be chosen.
      if (trigger.disabled) {
        close(root, false);
        return;
      }
      if (trigger.getAttribute('aria-expanded') !== 'true')
        trigger.setAttribute('aria-expanded', 'true');
      if (popup.style.top || replacing) return;
      // Placement writes its own styles before `top`; restore once.
      replacing = true;
      void place().finally(() => {
        replacing = false;
      });
    });
    restore.observe(trigger, {
      attributeFilter: ['aria-expanded', 'disabled'],
    });
    restore.observe(popup, { attributeFilter: ['style'] });
    following.set(popup, () => {
      restore.disconnect();
      stopFollowing();
    });
    const options = optionsOf(root);
    const target =
      focus === 'last'
        ? options[options.length - 1]
        : focus === 'first'
          ? options[0]
          : (chosenOptions(root)[0] ?? options[0]);
    focusOption(root, target);
  };

  const close = (root: HTMLElement, restoreFocus: boolean) => {
    const popup = popupOf(root);
    const focusInside = popup.contains(doc.activeElement);
    popup.hidePopover();
    if (restoreFocus && focusInside)
      triggerOf(root).focus({ preventScroll: true });
  };

  const choose = (root: HTMLElement, option: HTMLElement) => {
    if (isDisabled(option) || triggerOf(root).disabled) return;
    const value = optionValue(option);
    const multiple = root.hasAttribute('multiple');
    const values = chosenOptions(root).map(optionValue);
    const next = multiple
      ? values.includes(value)
        ? values.filter((candidate) => candidate !== value)
        : [...values, value]
      : [value];
    if (setChosen(root, next)) announce(root);
    if (!multiple) close(root, true);
  };

  const runAction = (root: HTMLElement, action: string) => {
    const next =
      action === 'all'
        ? optionsOf(root)
            .filter((option) => !isDisabled(option))
            .map(optionValue)
        : [];
    if (setChosen(root, next)) announce(root);
  };

  const runTypeahead = (root: HTMLElement, key: string): boolean => {
    const state = typeahead.get(root) ?? { query: '', timer: undefined };
    typeahead.set(root, state);
    win.clearTimeout(state.timer);
    state.timer = win.setTimeout(() => {
      state.query = '';
    }, SELECT_TYPEAHEAD_RESET);
    state.query =
      key === 'Backspace'
        ? state.query.slice(0, -1)
        : state.query + key.toLowerCase();
    const match = optionsOf(root).find((option) =>
      labelOf(option).toLowerCase().startsWith(state.query),
    );
    if (!match) return false;
    focusOption(root, match);
    return true;
  };

  // A press outside an open Select (and its trigger) closes it.
  doc.addEventListener(
    'pointerdown',
    (event) => {
      const path = event.composedPath();
      for (const root of [...openRoots]) {
        if (!root.isConnected || !isOpen(popupOf(root))) {
          openRoots.delete(root);
          continue;
        }
        if (!path.includes(root)) close(root, false);
      }
    },
    true,
  );

  doc.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const root = target.closest<HTMLElement>(ROOT);
      if (!root) return;
      const trigger = target.closest(TRIGGER);
      if (trigger?.parentElement === root) {
        const popup = popupOf(root);
        if (popup && isOpen(popup)) close(root, true);
        else open(root, 'chosen');
        return;
      }
      // The visible label focuses the trigger, as a native label would.
      if (target.closest('.kui-select__label')?.parentElement === root) {
        triggerOf(root).focus();
        return;
      }
      const action = target.closest<HTMLElement>('[data-select-action]');
      if (action) {
        runAction(root, action.getAttribute('data-select-action')!);
        return;
      }
      const option = target.closest<HTMLElement>('.kui-select__option');
      if (option) choose(root, option);
    },
    true,
  );

  doc.addEventListener(
    'keydown',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const root = target.closest<HTMLElement>(ROOT);
      if (!root || event.altKey || event.ctrlKey || event.metaKey) return;
      const popup = popupOf(root);
      const query = typeahead.get(root)?.query ?? '';
      // On the closed trigger: open, or open and find a typed choice.
      if (target.closest(TRIGGER)?.parentElement === root) {
        if (isOpen(popup)) return;
        switch (event.key) {
          case 'Enter':
          case ' ':
          case 'ArrowDown':
            event.preventDefault();
            open(root, 'chosen');
            return;
          case 'ArrowUp':
            event.preventDefault();
            open(root, 'chosen');
            return;
          case 'Home':
          case 'End':
            event.preventDefault();
            open(root, event.key === 'Home' ? 'first' : 'last');
            return;
          default:
            if (event.key.length === 1) {
              event.preventDefault();
              open(root, 'chosen');
              runTypeahead(root, event.key);
            }
        }
        return;
      }
      if (!popup.contains(target) || !isOpen(popup)) return;
      // Footer actions are native buttons: Enter and Space press them.
      const onAction = target.closest('[data-select-action]') !== null;
      const options = optionsOf(root);
      const current = target.closest<HTMLElement>('.kui-select__option');
      const index = current ? options.indexOf(current) : -1;
      const move = (next: HTMLElement | undefined) => {
        event.preventDefault();
        event.stopPropagation();
        focusOption(root, next);
      };
      switch (event.key) {
        case 'ArrowDown':
          move(
            options[index >= 0 && index < options.length - 1 ? index + 1 : 0],
          );
          return;
        case 'ArrowUp':
          move(options[index > 0 ? index - 1 : options.length - 1]);
          return;
        case 'Home':
          move(options[0]);
          return;
        case 'End':
          move(options[options.length - 1]);
          return;
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          close(root, true);
          return;
        case 'Tab':
          close(root, false);
          triggerOf(root).focus({ preventScroll: true });
          return;
        case 'Enter':
          if (onAction || !current) return;
          event.preventDefault();
          choose(root, current);
          return;
        case ' ':
          if (onAction || !current) return;
          event.preventDefault();
          if (query) runTypeahead(root, ' ');
          else choose(root, current);
          return;
        default:
          if (
            (event.key.length === 1 || event.key === 'Backspace') &&
            !onAction &&
            runTypeahead(root, event.key)
          ) {
            event.preventDefault();
            event.stopPropagation();
          }
      }
    },
    true,
  );

  // However a Select closes, its placement stops and its state resets.
  doc.addEventListener(
    'beforetoggle',
    (event) => {
      const popup = event.target as HTMLElement;
      if (popup.matches(POPUP) && (event as ToggleEvent).newState === 'closed')
        reset(popup);
    },
    true,
  );
}
