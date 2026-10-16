import { mount, signal } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ChoiceChips,
  type ChoiceChipsChoice,
} from '../../src/components/forms/choice-chips/choice-chips.js';
import {
  readChoiceChips,
  wireChoiceChips,
} from '../../src/components/forms/choice-chips/wiring/wire-choice-chips.js';

const choices: readonly ChoiceChipsChoice[] = [
  { value: 'a', label: 'Atlas' },
  { value: 'b', label: 'Borealis' },
  { value: 'c', label: 'Cirrus', disabled: true },
  { value: 'd', label: 'Delta' },
  { value: 'e', label: 'Ember' },
];

function setup(value: readonly string[] = [], extra = {}) {
  const form = document.createElement('form');
  form.innerHTML = String(
    ChoiceChips({
      id: 'ws',
      name: 'ws',
      label: 'Workspaces',
      multiple: true,
      value,
      action: 'pick-ws',
      choices,
      ...extra,
    }),
  );
  document.body.append(form);
  const group = form.querySelector<HTMLElement>('[role="listbox"]')!;
  const chip = (v: string) =>
    group.querySelector<HTMLElement>(`[data-choice-value="${v}"]`)!;
  const changes = vi.fn();
  group.addEventListener('change', changes);
  const stop = wireChoiceChips(form);
  const click = (v: string, init: MouseEventInit = {}) =>
    chip(v).dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, ...init }),
    );
  const key = (v: string, keyName: string, init: KeyboardEventInit = {}) =>
    chip(v).dispatchEvent(
      new KeyboardEvent('keydown', {
        key: keyName,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
  const submitted = () => new FormData(form).getAll('ws');
  return { form, group, chip, changes, stop, click, key, submitted };
}

// happy-dom reports a non-Apple platform, so Ctrl is the toggle key.
const toggle = { ctrlKey: true };

afterEach(() => document.body.replaceChildren());

describe('ChoiceChips multiple: true (listbox)', () => {
  it('renders a named multi-select listbox with one tab stop and hidden form values', () => {
    const { group, chip, submitted } = setup(['b', 'd']);
    expect(group.dataset.selectionMode).toBe('multiple');
    expect(group.getAttribute('aria-multiselectable')).toBe('true');
    expect(group.getAttribute('aria-label')).toBe('Workspaces');
    expect(group.dataset.action).toBe('pick-ws');
    expect(group.querySelectorAll('[role="option"]')).toHaveLength(5);
    expect(chip('b').getAttribute('aria-selected')).toBe('true');
    expect(chip('a').getAttribute('aria-selected')).toBe('false');
    expect(chip('c').getAttribute('aria-disabled')).toBe('true');
    // The first selected enabled chip is the tab stop.
    expect(
      [...group.querySelectorAll<HTMLElement>('[role="option"]')].map(
        (option) => option.tabIndex,
      ),
    ).toEqual([-1, 0, -1, -1, -1]);
    expect(
      group.querySelectorAll('input[type="checkbox"], input[type="radio"]'),
    ).toHaveLength(0);
    expect(submitted()).toEqual(['b', 'd']);
    expect(readChoiceChips(group)).toEqual(['b', 'd']);
  });

  it('makes the first enabled chip the tab stop with no value, and none when disabled', () => {
    const none = setup([]);
    expect(none.chip('a').tabIndex).toBe(0);
    document.body.replaceChildren();
    const off = setup(['a'], { disabled: true });
    expect(off.group.getAttribute('aria-disabled')).toBe('true');
    expect(
      [...off.group.querySelectorAll<HTMLElement>('[role="option"]')].every(
        (option) => option.tabIndex === -1,
      ),
    ).toBe(true);
    // A disabled group submits nothing and ignores input.
    expect(off.submitted()).toEqual([]);
    off.click('b');
    expect(off.changes).not.toHaveBeenCalled();
  });

  it('walks pointer gestures: click replaces, Ctrl toggles, Shift extends past a disabled chip', () => {
    const { click, group, changes, submitted } = setup(['a']);
    click('b');
    expect(readChoiceChips(group)).toEqual(['b']);
    click('e', { shiftKey: true });
    // The disabled chip stays out of the range.
    expect(readChoiceChips(group)).toEqual(['b', 'd', 'e']);
    click('d', toggle);
    expect(readChoiceChips(group)).toEqual(['b', 'e']);
    click('a', { shiftKey: true });
    // The toggle moved the anchor to d, so the range runs a..d.
    expect(readChoiceChips(group)).toEqual(['a', 'b', 'd']);
    expect(submitted()).toEqual(['a', 'b', 'd']);
    // Clicking the disabled chip changes nothing.
    click('c');
    // Re-selecting the same single chip twice fires change once.
    click('b');
    click('b');
    expect(readChoiceChips(group)).toEqual(['b']);
    expect(changes).toHaveBeenCalledTimes(5);
  });

  it('walks keyboard gestures: arrows select, Shift extends, Ctrl moves focus, Space toggles, Ctrl+A selects all', () => {
    const { key, chip, group, changes } = setup(['a']);
    chip('a').focus();
    key('a', 'ArrowRight');
    expect(document.activeElement).toBe(chip('b'));
    expect(chip('b').tabIndex).toBe(0);
    expect(chip('a').tabIndex).toBe(-1);
    expect(readChoiceChips(group)).toEqual(['b']);
    // Arrow keys skip the disabled chip.
    key('b', 'ArrowDown', { shiftKey: true });
    expect(document.activeElement).toBe(chip('d'));
    expect(readChoiceChips(group)).toEqual(['b', 'd']);
    key('d', 'End', toggle);
    expect(document.activeElement).toBe(chip('e'));
    expect(readChoiceChips(group)).toEqual(['b', 'd']);
    key('e', ' ');
    expect(readChoiceChips(group)).toEqual(['b', 'd', 'e']);
    key('e', 'Spacebar');
    expect(readChoiceChips(group)).toEqual(['b', 'd']);
    key('e', 'Home', { shiftKey: true });
    // The Space toggle anchored at e, so Shift+Home spans a..e.
    expect(readChoiceChips(group)).toEqual(['a', 'b', 'd', 'e']);
    key('a', 'ArrowLeft');
    expect(document.activeElement).toBe(chip('a'));
    key('a', 'ArrowUp');
    expect(readChoiceChips(group)).toEqual(['a', 'b', 'd', 'e']);
    key('a', ' ', { shiftKey: true });
    key('a', 'a', toggle);
    expect(readChoiceChips(group)).toEqual(['a', 'b', 'd', 'e']);
    key('a', 'Home');
    expect(readChoiceChips(group)).toEqual(['a']);
    // Unhandled, Alt-modified, and already-handled keys pass through.
    const before = changes.mock.calls.length;
    key('a', 'Enter');
    key('a', 'ArrowRight', { altKey: true });
    const handled = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    handled.preventDefault();
    chip('a').dispatchEvent(handled);
    expect(changes.mock.calls.length).toBe(before);
    expect(readChoiceChips(group)).toEqual(['a']);
  });

  it('mirrors Left and Right in right-to-left text', () => {
    const { key, group, chip } = setup(['b']);
    group.style.direction = 'rtl';
    key('b', 'ArrowLeft');
    expect(document.activeElement).toBe(chip('d'));
    key('d', 'ArrowRight');
    expect(document.activeElement).toBe(chip('b'));
  });

  it('keeps a selected disabled chip selected and in the form value', () => {
    const { click, key, group, submitted } = setup(['c']);
    click('a');
    expect(readChoiceChips(group)).toEqual(['a', 'c']);
    key('a', 'a', toggle);
    expect(submitted()).toEqual(['a', 'b', 'c', 'd', 'e']);
    key('c', ' ');
    expect(readChoiceChips(group)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('follows a controlled value the app adopts from change, and stops after disposal', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const value = signal<readonly string[]>(['a']);
    const dispose = mount(host, () =>
      ChoiceChips({
        name: 'ws',
        label: 'Workspaces',
        multiple: true,
        value: value.value,
        action: 'pick-ws',
        choices,
        form: 'outside',
      }),
    );
    const stop = wireChoiceChips(host);
    host.addEventListener('change', (event) => {
      value.value = readChoiceChips(event.target as Element);
    });
    const chip = (v: string) =>
      host.querySelector<HTMLElement>(`[data-choice-value="${v}"]`)!;
    chip('d').dispatchEvent(
      new MouseEvent('click', { bubbles: true, shiftKey: true }),
    );
    expect(value.value).toEqual(['a', 'b', 'd']);
    expect(chip('b').getAttribute('aria-selected')).toBe('true');
    const hidden = [
      ...host.querySelectorAll<HTMLInputElement>('input[type="hidden"]'),
    ];
    expect(hidden.map((input) => input.value)).toEqual(['a', 'b', 'd']);
    expect(
      hidden.every((input) => input.getAttribute('form') === 'outside'),
    ).toBe(true);
    value.value = [];
    expect(readChoiceChips(host.firstElementChild!)).toEqual([]);
    expect(host.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
    stop();
    chip('a').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(value.value).toEqual([]);
    dispose();
  });

  it('ignores events outside a multiple group and non-element targets', () => {
    const host = document.createElement('div');
    host.innerHTML = `${String(
      ChoiceChips({ name: 'one', label: 'One', choices, value: 'a' }),
    )}<span>outside</span>`;
    document.body.append(host);
    const stop = wireChoiceChips(document);
    host
      .querySelector('span')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    host
      .querySelector('label')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
    document.dispatchEvent(new MouseEvent('click'));
    expect(host.querySelector<HTMLInputElement>('input:checked')!.value).toBe(
      'a',
    );
    stop();
  });
});
