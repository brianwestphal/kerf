import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const floating = vi.hoisted(() => ({
  updates: [] as (() => void)[],
  stops: 0,
}));

vi.mock('@floating-ui/dom', () => ({
  computePosition: (
    _anchor: unknown,
    _popup: HTMLElement,
    options: { placement: string },
  ) => Promise.resolve({ x: 10, y: 20, placement: options.placement }),
  autoUpdate: (_anchor: unknown, _popup: HTMLElement, update: () => void) => {
    floating.updates.push(update);
    update();
    return () => {
      floating.stops += 1;
    };
  },
  flip: () => ({ name: 'flip', fn: () => ({}) }),
  shift: () => ({ name: 'shift', fn: () => ({}) }),
  size: () => ({ name: 'size', fn: () => ({}) }),
}));

import { mount, signal } from 'kerfjs';

import { Combobox } from '../../src/components/forms/combobox/combobox.js';
import { wireComboboxes } from '../../src/components/forms/combobox/wiring/wire-comboboxes.js';
import { installPopoverPolyfill, isShown } from './helpers/popover.js';

beforeAll(() => {
  installPopoverPolyfill();
});

function setup(props: Partial<Parameters<typeof Combobox>[0]> = {}) {
  const root = document.createElement('div');
  root.innerHTML = String(
    Combobox({
      id: 'tags',
      label: 'Tag',
      suggestions: ['bug', { value: 'docs', label: 'Documentation' }, 'design'],
      ...props,
    }),
  );
  document.body.append(root);
  const input = root.querySelector<HTMLInputElement>('input')!;
  const listbox = root.querySelector<HTMLElement>('[role="listbox"]')!;
  const onCommit = vi.fn();
  const stop = wireComboboxes(root, { onCommit });
  const type = (text: string) => {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const key = (name: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', {
      key: name,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    input.dispatchEvent(event);
    return event;
  };
  const visible = () =>
    [...listbox.querySelectorAll<HTMLElement>('[role="option"]')]
      .filter((option) => !option.hidden)
      .map((option) => option.textContent);
  return { root, input, listbox, onCommit, stop, type, key, visible };
}

describe('Combobox', () => {
  afterEach(() => document.body.replaceChildren());

  it('renders a labeled combobox input that controls a hidden listbox', () => {
    const html = String(
      Combobox({
        id: 'tags',
        label: 'Tag',
        suggestions: ['bug'],
        hint: 'Press Enter',
        name: 'tag',
        placeholder: 'Search',
        value: 'b',
        disabled: true,
        className: 'editor',
      }),
    );
    expect(html).toContain(
      'class="kui-combobox editor" data-component="combobox" data-combobox-id="tags" data-create-label="Create “{value}”" data-disabled="true"',
    );
    expect(html).toContain(
      '<label class="kui-combobox__label" for="tags">Tag</label>',
    );
    expect(html).toContain(
      'role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="tags-listbox" aria-describedby="tags-hint"',
    );
    expect(html).toContain(
      '<ul class="kui-combobox__listbox" id="tags-listbox" role="listbox" popover="manual" hidden>',
    );
    expect(html).toContain(
      '<div class="kui-combobox__hint" id="tags-hint">Press Enter</div>',
    );
    const only = String(
      Combobox({ id: 'x', label: 'X', suggestions: [], createLabel: false }),
    );
    expect(only).not.toContain('data-create');
    expect(only).not.toContain('aria-describedby');
  });

  it('shows the listbox in the top layer at the field width, capped, and stops following on close', async () => {
    const t = setup();
    const before = floating.stops;
    t.type('d');
    expect(isShown(t.listbox)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(t.listbox.style.maxHeight).toContain(
      'var(--_kui-combobox-max-height)',
    );
    expect(t.listbox.style.width).toMatch(/px$/);
    // Typing more while open keeps one follower.
    t.type('do');
    expect(isShown(t.listbox)).toBe(true);
    t.key('Escape');
    expect(isShown(t.listbox)).toBe(false);
    expect(t.listbox.hidden).toBe(true);
    expect(floating.stops).toBe(before + 1);
    // A placement that runs after the list closed does nothing.
    const width = t.listbox.style.width;
    floating.updates.at(-1)!();
    await Promise.resolve();
    expect(t.listbox.style.width).toBe(width);
    t.stop();
  });

  it('filters, creates, moves the active option, and commits', () => {
    const { input, listbox, onCommit, type, key, visible, stop } = setup();
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(visible()).toEqual(['bug', 'Documentation', 'design']);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    type('d');
    expect(visible()).toEqual(['Documentation', 'design', 'Create “d”']);
    key('ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe('tags-option-1');
    key('ArrowUp');
    expect(input.getAttribute('aria-activedescendant')).toBe(
      'tags-option-create',
    );
    key('ArrowUp');
    key('ArrowUp');
    expect(input.getAttribute('aria-activedescendant')).toBe('tags-option-1');
    expect(key('Enter').defaultPrevented).toBe(true);
    expect(onCommit).toHaveBeenLastCalledWith({
      id: 'tags',
      value: 'docs',
      created: false,
      input,
    });
    expect(listbox.hidden).toBe(true);

    // Typing an existing value exactly hides the create option and commits it.
    type('BUG');
    expect(visible()).toEqual(['bug']);
    key(',');
    expect(onCommit).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: 'bug', created: false }),
    );
    // New text creates; Escape closes; empty Enter does nothing.
    type('ux polish');
    key('Enter');
    expect(onCommit).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: 'ux polish', created: true }),
    );
    type('zzz');
    expect(key('Escape').defaultPrevented).toBe(true);
    expect(listbox.hidden).toBe(true);
    expect(key('Escape').defaultPrevented).toBe(false);
    type('');
    expect(key('Enter').defaultPrevented).toBe(false);
    expect(key('x', { isComposing: true }).defaultPrevented).toBe(false);
    expect(onCommit).toHaveBeenCalledTimes(3);
    stop();
  });

  it('opens with the arrows, commits a pressed option, and closes on blur', () => {
    const { input, listbox, onCommit, key, root, stop } = setup();
    key('ArrowUp');
    expect(input.getAttribute('aria-activedescendant')).toBe('tags-option-2');
    const option = listbox.querySelector<HTMLElement>('[data-value="bug"]')!;
    const press = new Event('pointerdown', { bubbles: true, cancelable: true });
    option.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(true);
    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'bug' }),
    );
    key('ArrowDown');
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(listbox.hidden).toBe(true);
    // Presses and keys outside a combobox are ignored.
    root.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    root.dispatchEvent(new Event('input', { bubbles: true }));
    const text = document.createTextNode('loose');
    root.append(text);
    text.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    root.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    stop();
  });

  it('only commits suggestions without a create option and skips an empty list', () => {
    const { onCommit, type, key, visible } = setup({
      suggestions: ['bug'],
      createLabel: false,
    });
    type('new');
    expect(visible()).toEqual([]);
    key('ArrowDown');
    key('Enter');
    expect(onCommit).not.toHaveBeenCalled();
    type('bu');
    key('Enter');
    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'bug', created: false }),
    );
  });
});

// KF-YA45PW: an application render while the field is focused re-applies the
// rendered closed state; the wiring keeps an open list open across it.
describe('Combobox across application renders', () => {
  afterEach(() => document.body.replaceChildren());

  const flush = () =>
    new Promise((resolve) => globalThis.setTimeout(resolve, 0));

  function mounted(root: HTMLElement | Document = document) {
    const host = document.createElement('div');
    document.body.append(host);
    const suggestions = signal<readonly string[]>(['bug', 'design']);
    const hint = signal('');
    const stopMount = mount(host, () =>
      Combobox({
        id: 'repo',
        label: 'Repository',
        suggestions: suggestions.value,
        hint: hint.value || undefined,
      }),
    );
    const onCommit = vi.fn();
    const stop = wireComboboxes(root, { onCommit });
    const input = () => host.querySelector<HTMLInputElement>('input')!;
    const listbox = () => host.querySelector<HTMLElement>('[role="listbox"]')!;
    const type = (text: string) => {
      input().value = text;
      input().dispatchEvent(new Event('input', { bubbles: true }));
    };
    const key = (name: string) =>
      input().dispatchEvent(
        new KeyboardEvent('keydown', {
          key: name,
          bubbles: true,
          cancelable: true,
        }),
      );
    const visible = () =>
      [...listbox().querySelectorAll<HTMLElement>('[role="option"]')]
        .filter((option) => !option.hidden)
        .map((option) => option.dataset.value);
    const open = () =>
      !listbox().hidden && input().getAttribute('aria-expanded') === 'true';
    const focus = () => {
      input().focus();
      input().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    };
    return {
      host,
      suggestions,
      hint,
      input,
      listbox,
      type,
      key,
      visible,
      open,
      focus,
      stop: () => {
        stop();
        stopMount();
      },
    };
  }

  it('keeps an open list open, filtered, when its suggestions change', async () => {
    const view = mounted();
    view.focus();
    view.type('d');
    expect(view.visible()).toEqual(['design', 'd']);
    view.key('ArrowDown');
    expect(view.input().getAttribute('aria-activedescendant')).toBe(
      'repo-option-1',
    );
    // Data arrives: the render writes the list back closed.
    view.suggestions.value = ['docs', 'bug', 'design', 'deploy'];
    await flush();
    expect(view.open()).toBe(true);
    expect(isShown(view.listbox())).toBe(true);
    // The new options are filtered against the typed text.
    expect(view.visible()).toEqual(['docs', 'design', 'deploy', 'd']);
    // The active option is the same suggestion, wherever it now sits.
    expect(view.input().getAttribute('aria-activedescendant')).toBe(
      'repo-option-2',
    );
    expect(document.activeElement).toBe(view.input());
    expect(view.input().value).toBe('d');
    // Removing the active suggestion leaves none active, still open.
    view.suggestions.value = ['docs', 'deploy'];
    await flush();
    expect(view.open()).toBe(true);
    expect(view.visible()).toEqual(['docs', 'deploy', 'd']);
    expect(view.input().hasAttribute('aria-activedescendant')).toBe(false);
    // A render that keeps the suggestions keeps it open too.
    view.hint.value = 'Owner/name';
    await flush();
    expect(view.open()).toBe(true);
    // Escape still closes, and a later render leaves it closed.
    view.key('Escape');
    expect(view.open()).toBe(false);
    view.suggestions.value = ['docs'];
    await flush();
    expect(view.listbox().hidden).toBe(true);
    view.stop();
  });

  it('leaves an unfocused or blurred list closed, and ignores other renders', async () => {
    const view = mounted(document.body);
    // Never focused: the render keeps it closed.
    view.suggestions.value = ['a', 'b'];
    await flush();
    expect(view.listbox().hidden).toBe(true);
    // Leaving the field closes it, and a render after that keeps it closed.
    view.focus();
    expect(view.open()).toBe(true);
    view.input().blur();
    view.input().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(view.open()).toBe(false);
    view.suggestions.value = ['a', 'b', 'c'];
    await flush();
    expect(view.listbox().hidden).toBe(true);
    // Focus in another field: a render does not touch this list.
    const other = document.createElement('input');
    document.body.append(other);
    other.focus();
    view.suggestions.value = ['a'];
    await flush();
    expect(view.listbox().hidden).toBe(true);
    // An open list survives a render elsewhere in the root untouched.
    view.focus();
    const elsewhere = document.createElement('p');
    document.body.append(elsewhere);
    elsewhere.hidden = true;
    await flush();
    expect(view.open()).toBe(true);
    // Disposed: renders no longer restore it.
    view.stop();
  });

  it('leaves alone a focused Combobox outside the wired root', async () => {
    const outside = document.createElement('div');
    outside.innerHTML = String(
      Combobox({ id: 'other', label: 'Other', suggestions: ['x'] }),
    );
    document.body.append(outside);
    const view = mounted();
    const host = view.host;
    // Rewire only the first view's host, then focus the other field.
    view.stop();
    const stop = wireComboboxes(host, { onCommit: vi.fn() });
    outside.querySelector('input')!.focus();
    const listbox = host.querySelector<HTMLElement>('[role="listbox"]')!;
    listbox.hidden = true;
    await flush();
    expect(listbox.hidden).toBe(true);
    stop();
  });

  it('stops restoring once disposed', async () => {
    const view = mounted();
    view.focus();
    expect(view.open()).toBe(true);
    view.stop();
    // A render the wiring no longer sees closes the list as rendered.
    const listbox = view.listbox();
    listbox.hidden = true;
    await flush();
    expect(listbox.hidden).toBe(true);
  });
});
