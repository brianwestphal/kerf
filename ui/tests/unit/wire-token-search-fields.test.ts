import { mount, type Signal,signal } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TokenSearchField } from '../../src/token-search-field.js';
import { type TokenSearchCollapsibleOptions, wireTokenSearchFields } from '../../src/wire-token-search-fields.js';

function focusAt(editor: HTMLElement, node: Node, offset: number) {
  const selection = document.getSelection()!;
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  editor.focus();
}

function inputEvent(type: 'beforeinput' | 'input', inputType = 'deleteContentForward') {
  return new InputEvent(type, { bubbles: true, inputType });
}

describe('wireTokenSearchFields', () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.getSelection()?.removeAllRanges();
  });

  it('submits Enter without inserting a contenteditable line break', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"></div></div>';
    const editor = root.querySelector<HTMLElement>('[data-token-search-editor]')!;
    const onSubmit = vi.fn();
    const stop = wireTokenSearchFields(root, { onSubmit });
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });

    editor.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith({ id: 'tickets', editor });
    stop();
  });

  it('ignores composition, other keys, and disabled fields', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="true"><div data-token-search-editor="tickets" contenteditable="false"></div></div>';
    const editor = root.querySelector<HTMLElement>('[data-token-search-editor]')!;
    const onSubmit = vi.fn();
    const stop = wireTokenSearchFields(root, { onSubmit });

    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }));
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true }));

    expect(onSubmit).not.toHaveBeenCalled();
    stop();
  });

  it('restores the text-relative caret when controlled rendering replaces an editor after token deletion', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML = '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>NOT </span><span data-component="token-search-token" data-token-value="tag:client" contenteditable="false">tag:client</span><span data-token-search-text> AND parser</span></div></div>';
    const editor = root.querySelector<HTMLElement>('[data-token-search-editor]')!;
    const firstText = editor.querySelector('[data-token-search-text]')!.firstChild!;
    const selection = document.getSelection()!;
    focusAt(editor, firstText, 4);
    const stop = wireTokenSearchFields(root, { onSubmit: vi.fn() });

    editor.dispatchEvent(inputEvent('beforeinput'));
    editor.querySelector('[data-component="token-search-token"]')!.remove();
    editor.dispatchEvent(inputEvent('input'));
    root.innerHTML = '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>NOT  AND parser</span></div></div>';
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    const replacement = root.querySelector<HTMLElement>('[data-token-search-editor]')!;
    expect(document.activeElement).toBe(replacement);
    expect(selection.anchorNode?.textContent).toBe('NOT  AND parser');
    expect(selection.anchorOffset).toBe(4);
    stop();
  });

  it('does not steal focus when deletion is not controlled or focus moves elsewhere', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML = '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>before</span><span data-component="token-search-token" contenteditable="false">token</span></div></div><button type="button">Elsewhere</button>';
    const editor = root.querySelector<HTMLElement>('[data-token-search-editor]')!;
    const text = editor.querySelector('[data-token-search-text]')!.firstChild!;
    const elsewhere = root.querySelector('button')!;
    const stop = wireTokenSearchFields(root, { onSubmit: vi.fn() });

    focusAt(editor, text, 6);
    editor.dispatchEvent(inputEvent('beforeinput'));
    editor.dispatchEvent(inputEvent('input'));
    expect(document.activeElement).toBe(editor);

    editor.dispatchEvent(inputEvent('beforeinput'));
    editor.querySelector('[data-component="token-search-token"]')!.remove();
    editor.dispatchEvent(inputEvent('input'));
    elsewhere.focus();
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    expect(document.activeElement).toBe(elsewhere);
    stop();
  });

  it('ignores unrelated input and missing deletion context', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML = '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>before</span><span data-component="token-search-token" contenteditable="false">token</span></div></div>';
    const editor = root.querySelector<HTMLElement>('[data-token-search-editor]')!;
    const text = editor.querySelector('[data-token-search-text]')!.firstChild!;
    const stop = wireTokenSearchFields(root, { onSubmit: vi.fn() });

    editor.dispatchEvent(inputEvent('beforeinput', 'insertText'));
    editor.dispatchEvent(inputEvent('input'));
    focusAt(editor, text, 6);
    editor.dispatchEvent(inputEvent('beforeinput'));
    editor.querySelector('[data-component="token-search-token"]')!.remove();
    editor.dispatchEvent(inputEvent('input'));
    root.replaceChildren();
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    expect(root.innerHTML).toBe('');
    stop();
  });

  it('ignores events and selections that cannot describe an enabled editor deletion', () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML = '<span>Outside</span><div data-component="token-search-field" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>query</span></div></div>';
    const outside = root.querySelector('span')!;
    const editor = root.querySelector<HTMLElement>('[data-token-search-editor]')!;
    const editorText = editor.querySelector('[data-token-search-text]')!.firstChild!;
    const stop = wireTokenSearchFields(root, { onSubmit: vi.fn() });

    outside.firstChild!.dispatchEvent(inputEvent('input'));
    outside.dispatchEvent(inputEvent('input'));
    editor.focus();
    document.getSelection()!.removeAllRanges();
    editor.dispatchEvent(inputEvent('beforeinput'));
    const outsideRange = document.createRange();
    outsideRange.setStart(outside.firstChild!, 1);
    outsideRange.collapse(true);
    document.getSelection()!.addRange(outsideRange);
    editor.dispatchEvent(inputEvent('beforeinput'));
    focusAt(editor, editorText, 2);
    editor.dispatchEvent(inputEvent('beforeinput'));
    editor.closest<HTMLElement>('[data-component="token-search-field"]')!.dataset.disabled = 'true';
    editor.dispatchEvent(inputEvent('beforeinput'));

    expect(document.activeElement).toBe(editor);
    stop();
  });
});

const raf = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
const micro = () => new Promise<void>((resolve) => window.queueMicrotask(() => resolve()));

function focusoutEvent(relatedTarget: EventTarget | null): FocusEvent {
  const event = new FocusEvent('focusout', { bubbles: true });
  Object.defineProperty(event, 'relatedTarget', { value: relatedTarget, configurable: true });
  return event;
}

interface MountedField {
  root: HTMLElement;
  expandedSignal: Signal<boolean>;
  query: Signal<string>;
  editor(): HTMLElement | null;
  trigger(): HTMLElement | null;
}

/** Mount a collapsible TokenSearchField whose `expanded` prop tracks `boundTo`, so a
 *  signal the helper drives re-renders the field the way a real app would. */
function mountCollapsibleField(boundTo?: Signal<boolean>): MountedField {
  const expandedSignal = boundTo ?? signal(false);
  const query = signal('');
  const root = document.createElement('div');
  document.body.append(root);
  mount(root, () =>
    TokenSearchField({
      id: 'find',
      label: 'Find in workspace',
      collapsible: true,
      expanded: expandedSignal.value,
      query: query.value,
      expandLabel: 'Open find',
    }),
  );
  return {
    root,
    expandedSignal,
    query,
    editor: () => root.querySelector<HTMLElement>('[data-token-search-editor]'),
    trigger: () => root.querySelector<HTMLElement>('.kui-token-search__expand'),
  };
}

function wireCollapsible(
  field: MountedField,
  collapsible: boolean | TokenSearchCollapsibleOptions = { signals: { find: field.expandedSignal } },
  onSubmit?: (submission: { id: string; editor: HTMLElement }) => void,
) {
  return wireTokenSearchFields(field.root, { onSubmit, collapsible });
}

describe('wireTokenSearchFields — managed collapsible behavior', () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.getSelection()?.removeAllRanges();
  });

  it('expands and focuses the editor when the iconic trigger is activated', async () => {
    const field = mountCollapsibleField();
    const handle = wireCollapsible(field);
    expect(field.editor()).toBeNull();

    field.trigger()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(field.expandedSignal.value).toBe(true);
    await raf();
    expect(document.activeElement).toBe(field.editor());
    handle();
  });

  it('collapses an empty field on Escape and returns focus to the trigger', async () => {
    const field = mountCollapsibleField(signal(true));
    const handle = wireCollapsible(field);
    const editor = field.editor()!;
    editor.focus();

    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

    expect(field.expandedSignal.value).toBe(false);
    await raf();
    expect(document.activeElement).toBe(field.trigger());
    handle();
  });

  it('leaves a non-empty field open on Escape', () => {
    const field = mountCollapsibleField(signal(true));
    const handle = wireCollapsible(field);
    const editor = field.editor()!;
    editor.textContent = 'priority';
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    editor.dispatchEvent(event);

    expect(field.expandedSignal.value).toBe(true);
    expect(event.defaultPrevented).toBe(false);
    handle();
  });

  it('collapses when focus leaves an empty field', async () => {
    const field = mountCollapsibleField(signal(true));
    const handle = wireCollapsible(field);
    const editor = field.editor()!;
    const outside = document.createElement('button');
    document.body.append(outside);
    editor.focus();

    outside.focus();
    editor.dispatchEvent(focusoutEvent(outside));
    await micro();

    expect(field.expandedSignal.value).toBe(false);
    handle();
  });

  it('does not collapse while focus stays on an in-field control', async () => {
    const field = mountCollapsibleField(signal(true));
    const handle = wireCollapsible(field);
    const editor = field.editor()!;
    const trailing = document.createElement('button');
    trailing.className = 'kui-token-search__trailing-probe';
    editor.closest('.kui-token-search')!.append(trailing);
    editor.focus();

    // relatedTarget is inside the field → early return, no collapse scheduled.
    editor.dispatchEvent(focusoutEvent(trailing));
    await micro();
    expect(field.expandedSignal.value).toBe(true);

    // relatedTarget null, but focus lands back in the field before the microtask runs.
    editor.dispatchEvent(focusoutEvent(null));
    trailing.focus();
    await micro();
    expect(field.expandedSignal.value).toBe(true);
    handle();
  });

  it('does not collapse when focus leaves a non-empty field', async () => {
    const field = mountCollapsibleField(signal(true));
    const handle = wireCollapsible(field);
    const editor = field.editor()!;
    editor.textContent = 'query';
    const outside = document.createElement('button');
    document.body.append(outside);

    outside.focus();
    editor.dispatchEvent(focusoutEvent(outside));
    await micro();

    expect(field.expandedSignal.value).toBe(true);
    handle();
  });

  it('keeps the editor focused when an in-field control is pressed', () => {
    const field = mountCollapsibleField(signal(true));
    const handle = wireCollapsible(field);
    const button = document.createElement('button');
    field.editor()!.closest('.kui-token-search')!.append(button);

    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    button.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    handle();
  });

  it('adopts an app-provided signal and exposes it from the handle', () => {
    const appOpen = signal(false);
    const field = mountCollapsibleField(appOpen);
    const handle = wireCollapsible(field);

    expect(handle.expanded('find')).toBe(appOpen);
    handle.open('find');
    expect(appOpen.value).toBe(true);
    handle.close('find');
    expect(appOpen.value).toBe(false);
    handle();
  });

  it('creates and reuses an expanded signal per field id when none is provided', async () => {
    const field = mountCollapsibleField(signal(false));
    const handle = wireTokenSearchFields(field.root, {});
    const created = handle.expanded('find');
    expect(created).toBeDefined();
    expect(handle.expanded('find')).toBe(created);

    // The helper owns the state; without the app binding it into render the field
    // stays collapsed, so the managed focus step finds no editor and safely no-ops.
    field.trigger()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(created!.value).toBe(true);
    await raf();
    expect(field.editor()).toBeNull();
    expect(document.activeElement).not.toBe(field.trigger());

    handle.open('find');
    expect(created!.value).toBe(true);
    handle.close('find');
    expect(created!.value).toBe(false);
    handle();
  });

  it('expands without focusing when focus is not managed', async () => {
    const field = mountCollapsibleField(signal(false));
    const handle = wireCollapsible(field, { signals: { find: field.expandedSignal }, manageFocus: false });

    field.trigger()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(field.expandedSignal.value).toBe(true);
    await raf();
    expect(field.editor()).not.toBeNull();
    expect(document.activeElement).not.toBe(field.editor());

    // close() flips the state without moving focus to the trigger.
    handle.close('find');
    await raf();
    expect(field.expandedSignal.value).toBe(false);
    expect(document.activeElement).not.toBe(field.trigger());
    handle();
  });

  it('opt-out: fully disables managed behavior and exposes no state', () => {
    const field = mountCollapsibleField(signal(false));
    const handle = wireCollapsible(field, false);

    field.trigger()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(field.expandedSignal.value).toBe(false);
    expect(handle.expanded('find')).toBeUndefined();
    expect(() => {
      handle.open('find');
      handle.close('find');
    }).not.toThrow();
    expect(field.expandedSignal.value).toBe(false);
    handle();
  });

  it('opt-out: disabling expandOnActivate leaves Escape-collapse intact', () => {
    const field = mountCollapsibleField(signal(true));
    const handle = wireCollapsible(field, { signals: { find: field.expandedSignal }, expandOnActivate: false });
    const editor = field.editor()!;

    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(field.expandedSignal.value).toBe(false);
    handle();
  });

  it('opt-out: disabling collapseOnEmptyBlur and collapseOnEscape keeps an empty field open', async () => {
    const field = mountCollapsibleField(signal(true));
    const handle = wireCollapsible(field, {
      signals: { find: field.expandedSignal },
      collapseOnEmptyBlur: false,
      collapseOnEscape: false,
    });
    const editor = field.editor()!;
    const outside = document.createElement('button');
    document.body.append(outside);

    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    outside.focus();
    editor.dispatchEvent(focusoutEvent(outside));
    await micro();

    expect(field.expandedSignal.value).toBe(true);
    // With collapse disabled, no mousedown guard is installed either.
    const button = document.createElement('button');
    editor.closest('.kui-token-search')!.append(button);
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    button.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(false);
    handle();
  });

  it('submits Enter when a handler is given and no-ops safely without one', () => {
    const field = mountCollapsibleField(signal(true));
    const onSubmit = vi.fn();
    const handle = wireCollapsible(field, { signals: { find: field.expandedSignal } }, onSubmit);
    const editor = field.editor()!;

    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onSubmit).toHaveBeenCalledWith({ id: 'find', editor });
    handle();

    const bare = wireTokenSearchFields(field.root);
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    expect(() => editor.dispatchEvent(event)).not.toThrow();
    expect(event.defaultPrevented).toBe(true);
    bare.dispose();
  });

  it('stops responding after disposal via either the callable or dispose()', () => {
    const first = mountCollapsibleField(signal(false));
    const firstHandle = wireCollapsible(first);
    firstHandle();
    first.trigger()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(first.expandedSignal.value).toBe(false);

    const second = mountCollapsibleField(signal(false));
    const secondHandle = wireCollapsible(second);
    secondHandle.dispose();
    second.trigger()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(second.expandedSignal.value).toBe(false);
  });

  it('ignores activation on a collapsible field with no id', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div class="kui-token-search" data-component="token-search-field" data-collapsible="true" data-expanded="false"><button type="button" class="kui-token-search__expand"></button></div>';
    document.body.append(root);
    const handle = wireTokenSearchFields(root);

    expect(() =>
      root.querySelector<HTMLElement>('.kui-token-search__expand')!.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    ).not.toThrow();
    handle();
  });

  it('ignores activation and Escape on a disabled collapsible field', async () => {
    const query = signal('');
    const open = signal(false);
    const root = document.createElement('div');
    document.body.append(root);
    mount(root, () =>
      TokenSearchField({
        id: 'find',
        label: 'Find',
        collapsible: true,
        disabled: true,
        expanded: open.value,
        query: query.value,
        expandLabel: 'Open find',
      }),
    );
    const handle = wireTokenSearchFields(root, { collapsible: { signals: { find: open } } });

    root.querySelector<HTMLElement>('.kui-token-search__expand')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await raf();
    expect(open.value).toBe(false);
    handle();
  });
});
