import {
  applySelection,
  isApplePlatform,
  type SelectionGesture,
  selectionGesture,
} from '../../../../shared/selection/selection.js';

const GROUP = '[data-component="choice-chips"][data-selection-mode="multiple"]';
const OPTION = '.kui-choice-chips__chip[role="option"]';

function optionsOf(group: Element): HTMLElement[] {
  return Array.from(group.querySelectorAll<HTMLElement>(OPTION)).filter(
    (option) => option.closest(GROUP) === group,
  );
}

const valueOf = (option: HTMLElement) => option.dataset.choiceValue!;
const isEnabled = (option: HTMLElement) =>
  option.getAttribute('aria-disabled') !== 'true';

/** The selected values of a `multiple: true` ChoiceChips group, in choice order. */
export function readChoiceChips(group: Element): string[] {
  return optionsOf(group)
    .filter((option) => option.getAttribute('aria-selected') === 'true')
    .map(valueOf);
}

/**
 * Give every `multiple: true` ChoiceChips group under `root` its listbox
 * behavior: a click selects one chip, Cmd (Apple platforms) or Ctrl
 * (elsewhere) toggles one, and Shift extends a range from the last plain or
 * toggled chip. On the keyboard the group is one Tab stop: arrows, Home, and
 * End move the selection, Shift with them extends it, Cmd/Ctrl with them
 * moves focus alone, Space toggles the focused chip (Shift+Space extends to
 * it), and Cmd/Ctrl+A selects every chip. Disabled chips keep their state.
 * Each change updates `aria-selected` and the hidden form inputs, then fires
 * a bubbling `change` on the group, whose `data-action` is the group's
 * `action`; read the new set with `readChoiceChips`. Returns a disposer.
 */
export function wireChoiceChips(root: HTMLElement | Document): () => void {
  const anchors = new WeakMap<Element, string>();
  const apple = isApplePlatform();

  const moveFocus = (group: Element, target: HTMLElement) => {
    for (const option of optionsOf(group))
      option.tabIndex = option === target ? 0 : -1;
    target.focus();
  };

  const commit = (group: HTMLElement, next: readonly string[]) => {
    const before = readChoiceChips(group);
    const options = optionsOf(group);
    const keep = new Set(next);
    // A disabled chip cannot be changed by the user: it keeps its state.
    for (const option of options)
      if (!isEnabled(option) && before.includes(valueOf(option)))
        keep.add(valueOf(option));
    for (const option of options)
      option.setAttribute(
        'aria-selected',
        keep.has(valueOf(option)) ? 'true' : 'false',
      );
    const after = readChoiceChips(group);
    if (after.join('\u0000') === before.join('\u0000')) return;
    for (const input of group.querySelectorAll(
      ':scope > input.kui-choice-chips__value',
    ))
      input.remove();
    for (const value of after) {
      const input = group.ownerDocument.createElement('input');
      input.className = 'kui-choice-chips__value';
      input.type = 'hidden';
      input.name = group.dataset.name ?? '';
      input.value = value;
      if (group.dataset.form) input.setAttribute('form', group.dataset.form);
      group.append(input);
    }
    group.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const select = (
    group: HTMLElement,
    target: HTMLElement,
    gesture: SelectionGesture,
  ) => {
    const value = valueOf(target);
    const result = applySelection({
      items: optionsOf(group).filter(isEnabled).map(valueOf),
      selected: readChoiceChips(group),
      anchor: anchors.get(group),
      target: value,
      gesture,
    });
    anchors.set(group, result.anchor);
    commit(group, result.selected);
  };

  const locate = (event: Event) => {
    const option =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(OPTION)
        : null;
    const group = option?.closest<HTMLElement>(GROUP);
    if (!option || !group || group.getAttribute('aria-disabled') === 'true')
      return null;
    return { option, group };
  };

  const click = (event: Event) => {
    const hit = locate(event);
    if (!hit || !isEnabled(hit.option)) return;
    moveFocus(hit.group, hit.option);
    select(hit.group, hit.option, selectionGesture(event as MouseEvent, apple));
  };

  const keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey) return;
    const hit = locate(event);
    if (!hit) return;
    const { option, group } = hit;
    const toggleKey = apple ? event.metaKey : event.ctrlKey;
    const enabled = optionsOf(group).filter(isEnabled);
    if (toggleKey && !event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      commit(group, enabled.map(valueOf));
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (!isEnabled(option)) return;
      select(group, option, event.shiftKey ? 'extend' : 'toggle');
      return;
    }
    const rtl =
      group.ownerDocument.defaultView?.getComputedStyle(group).direction ===
      'rtl';
    const index = enabled.indexOf(option);
    let next: HTMLElement | undefined;
    switch (event.key) {
      case 'ArrowDown':
        next = enabled[index + 1];
        break;
      case 'ArrowUp':
        next = enabled[index - 1];
        break;
      case 'ArrowRight':
        next = enabled[index + (rtl ? -1 : 1)];
        break;
      case 'ArrowLeft':
        next = enabled[index + (rtl ? 1 : -1)];
        break;
      case 'Home':
        next = enabled[0];
        break;
      case 'End':
        next = enabled[enabled.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    if (!next) return;
    moveFocus(group, next);
    if (toggleKey && !event.shiftKey) return;
    select(group, next, event.shiftKey ? 'extend' : 'replace');
  };

  root.addEventListener('click', click);
  root.addEventListener('keydown', keydown as EventListener);
  return () => {
    root.removeEventListener('click', click);
    root.removeEventListener('keydown', keydown as EventListener);
  };
}
