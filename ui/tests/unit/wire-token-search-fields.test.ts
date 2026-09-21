import { mount, type Signal, signal } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TokenSearchField } from '../../src/token-search-field.js';
import {
  type TokenSearchCollapsibleOptions,
  type TokenSearchKeyboardOptions,
  wireTokenSearchFields,
} from '../../src/wire-token-search-fields.js';

function focusAt(editor: HTMLElement, node: Node, offset: number) {
  const selection = document.getSelection()!;
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  editor.focus();
}

function inputEvent(
  type: 'beforeinput' | 'input',
  inputType = 'deleteContentForward',
) {
  return new InputEvent(type, { bubbles: true, inputType });
}

describe('wireTokenSearchFields', () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.getSelection()?.removeAllRanges();
  });

  it('submits Enter without inserting a contenteditable line break', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"></div></div>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const onSubmit = vi.fn();
    const stop = wireTokenSearchFields(root, { onSubmit });
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });

    editor.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith({ id: 'tickets', editor });
    stop();
  });

  it('ignores composition, other keys, and disabled fields', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="true"><div data-token-search-editor="tickets" contenteditable="false"></div></div>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const onSubmit = vi.fn();
    const stop = wireTokenSearchFields(root, { onSubmit });

    editor.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'a',
        bubbles: true,
        cancelable: true,
      }),
    );
    editor.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    editor.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
        isComposing: true,
      }),
    );
    editor.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    const disabledDelete = new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
      cancelable: true,
    });
    editor.dispatchEvent(disabledDelete);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(disabledDelete.defaultPrevented).toBe(false);
    stop();
  });

  it('restores the text-relative caret when controlled rendering replaces an editor after token deletion', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>NOT </span><span data-component="token-search-token" data-token-value="tag:client" contenteditable="false">tag:client</span><span data-token-search-text> AND parser</span></div></div>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const firstText = editor.querySelector(
      '[data-token-search-text]',
    )!.firstChild!;
    const selection = document.getSelection()!;
    focusAt(editor, firstText, 4);
    const stop = wireTokenSearchFields(root, { onSubmit: vi.fn() });

    editor.dispatchEvent(inputEvent('beforeinput'));
    editor.querySelector('[data-component="token-search-token"]')!.remove();
    editor.dispatchEvent(inputEvent('input'));
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>NOT  AND parser</span></div></div>';
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    const replacement = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    expect(document.activeElement).toBe(replacement);
    expect(selection.anchorNode?.textContent).toBe('NOT  AND parser');
    expect(selection.anchorOffset).toBe(4);
    stop();
  });

  it('strips the bogus <br> a delete-to-empty leaves and restores the canonical empty text span', () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>hello</span></div></div>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const stop = wireTokenSearchFields(root, { onSubmit: vi.fn() });

    // Simulate what a contenteditable host does on select-all + Delete: the text
    // is gone and a bogus <br> is left behind.
    editor.innerHTML = '<br>';
    editor.focus();
    editor.dispatchEvent(inputEvent('input', 'deleteContentBackward'));

    expect(editor.querySelectorAll('br')).toHaveLength(0);
    expect(editor.childNodes).toHaveLength(1);
    const span = editor.firstElementChild!;
    expect(span.matches('[data-token-search-text]')).toBe(true);
    expect((editor.textContent ?? '').replaceAll('​', '')).toBe('');
    // The caret is placed inside the restored span so typing resumes cleanly.
    const selection = document.getSelection()!;
    expect(
      span.contains(selection.anchorNode) || selection.anchorNode === span,
    ).toBe(true);
    stop();
  });

  it('clears an atomic chip left behind by a select-all deletion', () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>before </span><span data-component="token-search-token" data-token-value="tag:x" contenteditable="false">tag:x</span><span data-token-search-text> after</span></div></div>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const onEdit = vi.fn();
    const stop = wireTokenSearchFields(root, { onEdit });
    const selection = document.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();

    editor.dispatchEvent(inputEvent('beforeinput'));
    // Some engines only remove part of a contenteditable selection containing
    // contenteditable=false chips. Preserve that failure shape for regression.
    editor.innerHTML =
      '<span data-component="token-search-token" data-token-value="tag:x" contenteditable="false">tag:x</span><br>';
    editor.dispatchEvent(inputEvent('input'));

    expect(
      editor.querySelectorAll('[data-component="token-search-token"]'),
    ).toHaveLength(0);
    expect(editor.querySelectorAll('br')).toHaveLength(0);
    expect(editor.firstElementChild!.matches('[data-token-search-text]')).toBe(
      true,
    );
    expect(editor.textContent).toBe('');
    expect(onEdit).toHaveBeenCalledOnce();
    stop();
  });

  it('recognizes full logical selection when range endpoints are inside text spans', () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>before </span><span data-component="token-search-token" data-token-value="tag:x" contenteditable="false">tag:x</span><span data-token-search-text> after</span></div></div>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const textSpans = editor.querySelectorAll('[data-token-search-text]');
    const firstText = textSpans[0]!.firstChild!;
    const lastText = textSpans[1]!.firstChild!;
    const selection = document.getSelection()!;
    const range = document.createRange();
    range.setStart(firstText, 0);
    range.setEnd(lastText, lastText.textContent!.length);
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
    const stop = wireTokenSearchFields(root);

    editor.dispatchEvent(inputEvent('beforeinput'));
    editor.innerHTML =
      '<span data-component="token-search-token" data-token-value="tag:x" contenteditable="false">tag:x</span>';
    editor.dispatchEvent(inputEvent('input'));

    expect(
      editor.querySelectorAll('[data-component="token-search-token"]'),
    ).toHaveLength(0);
    expect(editor.firstElementChild!.matches('[data-token-search-text]')).toBe(
      true,
    );
    expect(editor.textContent).toBe('');
    stop();
  });

  it.each([
    ['Delete', 'deleteContentForward'],
    ['Backspace', 'deleteContentBackward'],
  ] as const)(
    'owns Ctrl+A then %s so controlled state observes a deterministic empty edit',
    (key, inputType) => {
      const root = document.createElement('div');
      document.body.append(root);
      root.innerHTML =
        '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>before </span><span data-component="token-search-token" data-token-value="tag:x" contenteditable="false">tag:x</span><span data-token-search-text> after</span></div></div>';
      const editor = root.querySelector<HTMLElement>(
        '[data-token-search-editor]',
      )!;
      const onEdit = vi.fn();
      const stop = wireTokenSearchFields(root, { onEdit });

      editor.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'a',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      const deletion = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      editor.dispatchEvent(deletion);

      expect(deletion.defaultPrevented).toBe(true);
      expect(
        editor.querySelectorAll('[data-component="token-search-token"]'),
      ).toHaveLength(0);
      expect(
        editor.firstElementChild!.matches('[data-token-search-text]'),
      ).toBe(true);
      expect(editor.textContent).toBe('');
      expect(onEdit).toHaveBeenCalledOnce();
      expect(onEdit.mock.calls[0]![0].event.inputType).toBe(inputType);
      stop();
    },
  );

  it('preserves a full-delete snapshot across a controlled editor replacement', () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>before </span><span data-component="token-search-token" data-token-value="tag:x" contenteditable="false">tag:x</span><span data-token-search-text> after</span></div></div>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const stop = wireTokenSearchFields(root);
    const selection = document.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
    editor.dispatchEvent(inputEvent('beforeinput'));
    const replacement = editor.cloneNode(false) as HTMLElement;
    replacement.innerHTML =
      '<span data-component="token-search-token" data-token-value="tag:x" contenteditable="false">tag:x</span>';
    editor.replaceWith(replacement);
    replacement.dispatchEvent(inputEvent('input'));

    expect(
      replacement.querySelectorAll('[data-component="token-search-token"]'),
    ).toHaveLength(0);
    expect(replacement.textContent).toBe('');
    stop();
  });

  it('expires keyboard select-all intent after caret navigation', () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>before </span><span data-component="token-search-token" data-token-value="tag:x" contenteditable="false">tag:x</span><span data-token-search-text> after</span></div></div>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const firstText = editor.querySelector(
      '[data-token-search-text]',
    )!.firstChild!;
    focusAt(editor, firstText, 0);
    const stop = wireTokenSearchFields(root);

    editor.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    editor.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    const deletion = new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
      cancelable: true,
    });
    editor.dispatchEvent(deletion);

    expect(deletion.defaultPrevented).toBe(false);
    expect(
      editor.querySelectorAll('[data-component="token-search-token"]'),
    ).toHaveLength(1);
    expect(editor.textContent).toContain('before');
    stop();
  });

  it('drops a stray <br> around surviving chips without wiping the field', () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>a</span><span data-component="token-search-token" data-token-value="tag:x" contenteditable="false">tag:x</span><br></div></div>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const stop = wireTokenSearchFields(root, { onSubmit: vi.fn() });

    editor.dispatchEvent(inputEvent('input', 'deleteContentForward'));

    expect(editor.querySelectorAll('br')).toHaveLength(0);
    expect(
      editor.querySelectorAll('[data-component="token-search-token"]'),
    ).toHaveLength(1);
    expect(editor.querySelector('[data-token-search-text]')!.textContent).toBe(
      'a',
    );
    stop();
  });

  it('removes a stray <br> but keeps surviving text when the field is not empty', () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>hi</span><br></div></div>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    editor.focus();
    const stop = wireTokenSearchFields(root, { onSubmit: vi.fn() });

    editor.dispatchEvent(inputEvent('input', 'deleteContentBackward'));

    expect(editor.querySelectorAll('br')).toHaveLength(0);
    // Non-empty text is preserved — no canonical-span rebuild.
    expect(editor.querySelector('[data-token-search-text]')!.textContent).toBe(
      'hi',
    );
    stop();
  });

  it('normalizes a delete-to-empty editor without moving the caret when it is not focused', () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><br></div></div><button type="button">Elsewhere</button>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const elsewhere = root.querySelector('button')!;
    elsewhere.focus();
    const stop = wireTokenSearchFields(root, { onSubmit: vi.fn() });

    editor.dispatchEvent(inputEvent('input', 'deleteContentForward'));

    // The bogus <br> is stripped and the canonical span restored, but focus/caret
    // stay with the other element.
    expect(editor.querySelectorAll('br')).toHaveLength(0);
    expect(editor.firstElementChild!.matches('[data-token-search-text]')).toBe(
      true,
    );
    expect(document.activeElement).toBe(elsewhere);
    stop();
  });

  it('leaves a non-delete input untouched even if it carries a <br>', () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><br></div></div>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const stop = wireTokenSearchFields(root, { onSubmit: vi.fn() });

    editor.dispatchEvent(inputEvent('input', 'insertText'));

    // Only delete inputs are normalized; other input types are left alone.
    expect(editor.querySelectorAll('br')).toHaveLength(1);
    stop();
  });

  it('does not steal focus when deletion is not controlled or focus moves elsewhere', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>before</span><span data-component="token-search-token" contenteditable="false">token</span></div></div><button type="button">Elsewhere</button>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
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
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>before</span><span data-component="token-search-token" contenteditable="false">token</span></div></div>';
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
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
    root.innerHTML =
      '<span>Outside</span><div data-component="token-search-field" data-disabled="false"><div data-token-search-editor="tickets" contenteditable="true"><span data-token-search-text>query</span></div></div>';
    const outside = root.querySelector('span')!;
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const editorText = editor.querySelector(
      '[data-token-search-text]',
    )!.firstChild!;
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
    editor.closest<HTMLElement>(
      '[data-component="token-search-field"]',
    )!.dataset.disabled = 'true';
    editor.dispatchEvent(inputEvent('beforeinput'));

    expect(document.activeElement).toBe(editor);
    stop();
  });
});

const raf = () =>
  new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
const micro = () =>
  new Promise<void>((resolve) => window.queueMicrotask(() => resolve()));

function focusoutEvent(relatedTarget: EventTarget | null): FocusEvent {
  const event = new FocusEvent('focusout', { bubbles: true });
  Object.defineProperty(event, 'relatedTarget', {
    value: relatedTarget,
    configurable: true,
  });
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
  collapsible: boolean | TokenSearchCollapsibleOptions = {
    signals: { find: field.expandedSignal },
  },
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

    editor.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );

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
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });

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

    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
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
    const handle = wireCollapsible(field, {
      signals: { find: field.expandedSignal },
      manageFocus: false,
    });

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
    const handle = wireCollapsible(field, {
      signals: { find: field.expandedSignal },
      expandOnActivate: false,
    });
    const editor = field.editor()!;

    editor.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );
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

    editor.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );
    outside.focus();
    editor.dispatchEvent(focusoutEvent(outside));
    await micro();

    expect(field.expandedSignal.value).toBe(true);
    // With collapse disabled, no mousedown guard is installed either.
    const button = document.createElement('button');
    editor.closest('.kui-token-search')!.append(button);
    const press = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    button.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(false);
    handle();
  });

  it('submits Enter when a handler is given and no-ops safely without one', () => {
    const field = mountCollapsibleField(signal(true));
    const onSubmit = vi.fn();
    const handle = wireCollapsible(
      field,
      { signals: { find: field.expandedSignal } },
      onSubmit,
    );
    const editor = field.editor()!;

    editor.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onSubmit).toHaveBeenCalledWith({ id: 'find', editor });
    handle();

    const bare = wireTokenSearchFields(field.root);
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
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
      root
        .querySelector<HTMLElement>('.kui-token-search__expand')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true })),
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
    const handle = wireTokenSearchFields(root, {
      collapsible: { signals: { find: open } },
    });

    root
      .querySelector<HTMLElement>('.kui-token-search__expand')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await raf();
    expect(open.value).toBe(false);
    handle();
  });

  it('keeps an empty field open when focus moves to a data-token-search-keep-open region', async () => {
    const field = mountCollapsibleField(signal(true));
    const handle = wireCollapsible(field);
    const editor = field.editor()!;
    const suggestions = document.createElement('div');
    suggestions.setAttribute('data-token-search-keep-open', '');
    const option = document.createElement('button');
    suggestions.append(option);
    document.body.append(suggestions);

    option.focus();
    editor.dispatchEvent(focusoutEvent(option));
    await micro();

    expect(field.expandedSignal.value).toBe(true);
    handle();
  });

  it('keeps an empty field open when keepOpenOn approves the focus target, else collapses', async () => {
    const field = mountCollapsibleField(signal(true));
    const picker = document.createElement('button');
    document.body.append(picker);
    const handle = wireCollapsible(field, {
      signals: { find: field.expandedSignal },
      keepOpenOn: (node) => node === picker,
    });
    const editor = field.editor()!;

    picker.focus();
    editor.dispatchEvent(focusoutEvent(picker));
    await micro();
    expect(field.expandedSignal.value).toBe(true);

    // A target the predicate rejects still collapses.
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    editor.dispatchEvent(focusoutEvent(outside));
    await micro();
    expect(field.expandedSignal.value).toBe(false);
    handle();
  });
});

/** A field rendered with a leading text run, one atomic chip, and a trailing run. */
function tokenedField(): {
  root: HTMLElement;
  editor: HTMLElement;
  chip: HTMLElement;
  lead: Text;
  tail: Text;
} {
  const root = document.createElement('div');
  root.innerHTML =
    '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false">' +
    '<div data-token-search-editor="tickets" contenteditable="true">' +
    '<span data-token-search-text>due </span>' +
    '<span data-component="token-search-token" data-token-value="tag:client" contenteditable="false">' +
    '<button type="button">tag:client</button><button type="button" aria-label="Remove">x</button></span>' +
    '<span data-token-search-text> soon</span>' +
    '</div></div>';
  document.body.append(root);
  const editor = root.querySelector<HTMLElement>('[data-token-search-editor]')!;
  const spans = editor.querySelectorAll('[data-token-search-text]');
  return {
    root,
    editor,
    chip: editor.querySelector<HTMLElement>(
      '[data-component="token-search-token"]',
    )!,
    lead: spans[0].firstChild as Text,
    tail: spans[1].firstChild as Text,
  };
}

function keydown(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
}

describe('wireTokenSearchFields — onEdit callback', () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.getSelection()?.removeAllRanges();
  });

  it('fires onEdit for editor input and ignores disabled fields and non-editor input', () => {
    const { root, editor } = tokenedField();
    const onEdit = vi.fn();
    const handle = wireTokenSearchFields(root, { onEdit });

    const typed = inputEvent('input', 'insertText');
    editor.dispatchEvent(typed);
    // onEdit exposes the originating InputEvent so a caller can read inputType/data.
    expect(onEdit).toHaveBeenCalledWith({
      id: 'tickets',
      editor,
      event: typed,
    });
    expect(onEdit.mock.calls[0][0].event.inputType).toBe('insertText');

    onEdit.mockClear();
    root.querySelector<HTMLElement>(
      '[data-component="token-search-field"]',
    )!.dataset.disabled = 'true';
    editor.dispatchEvent(inputEvent('input', 'insertText'));
    expect(onEdit).not.toHaveBeenCalled();

    // Input that does not originate in an editor is ignored.
    root.dispatchEvent(inputEvent('input', 'insertText'));
    expect(onEdit).not.toHaveBeenCalled();
    handle();
  });
});

describe('wireTokenSearchFields — opt-in chip keyboard', () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.getSelection()?.removeAllRanges();
  });

  it('is off by default (no keyboard option)', () => {
    const { root, editor, tail } = tokenedField();
    const handle = wireTokenSearchFields(root);

    focusAt(editor, tail, 0);
    const event = keydown('Backspace');
    editor.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    handle();
  });

  it('Backspace removes the token before the caret and Delete the token after', () => {
    const { root, editor, lead, tail } = tokenedField();
    const onRemoveToken = vi.fn();
    const handle = wireTokenSearchFields(root, { keyboard: { onRemoveToken } });

    // Caret at the start of the trailing run — immediately after the chip.
    focusAt(editor, tail, 0);
    const back = keydown('Backspace');
    editor.dispatchEvent(back);
    expect(back.defaultPrevented).toBe(true);
    expect(onRemoveToken).toHaveBeenCalledWith({
      id: 'tickets',
      value: 'tag:client',
      editor,
      direction: 'backward',
    });

    // Caret at the end of the leading run — immediately before the chip.
    onRemoveToken.mockClear();
    focusAt(editor, lead, lead.length);
    const del = keydown('Delete');
    editor.dispatchEvent(del);
    expect(del.defaultPrevented).toBe(true);
    expect(onRemoveToken).toHaveBeenCalledWith({
      id: 'tickets',
      value: 'tag:client',
      editor,
      direction: 'forward',
    });
    handle();
  });

  it('does not remove a chip when a real character separates it from the caret', () => {
    const { root, editor, lead } = tokenedField();
    const onRemoveToken = vi.fn();
    const handle = wireTokenSearchFields(root, { keyboard: { onRemoveToken } });

    // Caret amid the leading text: Backspace deletes a character, not the chip.
    focusAt(editor, lead, 2);
    const back = keydown('Backspace');
    editor.dispatchEvent(back);
    expect(back.defaultPrevented).toBe(false);
    expect(onRemoveToken).not.toHaveBeenCalled();
    handle();
  });

  it('does not act on a ranged selection', () => {
    const { root, editor, lead, tail } = tokenedField();
    const onRemoveToken = vi.fn();
    const handle = wireTokenSearchFields(root, { keyboard: { onRemoveToken } });

    const selection = document.getSelection()!;
    const range = document.createRange();
    range.setStart(lead, 0);
    range.setEnd(tail, 1);
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
    const back = keydown('Backspace');
    editor.dispatchEvent(back);
    expect(back.defaultPrevented).toBe(false);
    expect(onRemoveToken).not.toHaveBeenCalled();
    handle();
  });

  it('ArrowRight moves the caret past a trailing chip', () => {
    const { root, editor, lead, chip } = tokenedField();
    const handle = wireTokenSearchFields(root, {
      keyboard: { removeAdjacentToken: false },
    });

    focusAt(editor, lead, lead.length);
    const event = keydown('ArrowRight');
    editor.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    // The chip is now behind the caret: everything from the editor start to the
    // caret includes the chip.
    const selection = document.getSelection()!;
    const range = selection.getRangeAt(0);
    const before = document.createRange();
    before.setStart(editor, 0);
    before.setEnd(range.startContainer, range.startOffset);
    expect(
      before
        .cloneContents()
        .querySelector('[data-component="token-search-token"]'),
    ).not.toBeNull();
    expect(chip.dataset.tokenValue).toBe('tag:client');
    handle();
  });

  it('ArrowRight is inert when no chip follows the caret', () => {
    const { root, editor, tail } = tokenedField();
    const handle = wireTokenSearchFields(root, {
      keyboard: { removeAdjacentToken: false },
    });

    focusAt(editor, tail, 1);
    const event = keydown('ArrowRight');
    editor.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    handle();
  });

  it('respects per-behavior opt-out within keyboard', () => {
    const { root, editor, tail, lead } = tokenedField();
    const handle = wireTokenSearchFields(root, {
      keyboard: {
        removeAdjacentToken: false,
        moveCaretPastToken: false,
      },
    });

    focusAt(editor, tail, 0);
    const back = keydown('Backspace');
    editor.dispatchEvent(back);
    expect(back.defaultPrevented).toBe(false);

    focusAt(editor, lead, lead.length);
    const arrow = keydown('ArrowRight');
    editor.dispatchEvent(arrow);
    expect(arrow.defaultPrevented).toBe(false);
    handle();
  });

  it('does nothing without a caret range', () => {
    const { root, editor } = tokenedField();
    const handle = wireTokenSearchFields(root, {
      keyboard: true as unknown as TokenSearchKeyboardOptions,
    });
    editor.focus();
    document.getSelection()!.removeAllRanges();

    const back = keydown('Backspace');
    editor.dispatchEvent(back);
    expect(back.defaultPrevented).toBe(false);
    handle();
  });

  it('finds an adjacent chip when the caret sits directly in the editor between blocks', () => {
    const { root, editor, chip } = tokenedField();
    const onRemoveToken = vi.fn();
    const handle = wireTokenSearchFields(root, { keyboard: { onRemoveToken } });

    // Caret directly in the editor, just after the chip (child index 2 = trailing run).
    focusAt(editor, editor, 2);
    editor.dispatchEvent(keydown('Backspace'));
    expect(onRemoveToken).toHaveBeenLastCalledWith({
      id: 'tickets',
      value: chip.dataset.tokenValue,
      editor,
      direction: 'backward',
    });

    // Caret at the end of the leading run element (no child at that offset) — the chip is the next block.
    onRemoveToken.mockClear();
    const lead = editor.querySelector('[data-token-search-text]')!;
    focusAt(editor, lead, lead.childNodes.length);
    editor.dispatchEvent(keydown('Delete'));
    expect(onRemoveToken).toHaveBeenLastCalledWith({
      id: 'tickets',
      value: chip.dataset.tokenValue,
      editor,
      direction: 'forward',
    });
    handle();
  });

  it('does nothing when the caret sits past the last block', () => {
    const { root, editor } = tokenedField();
    const onRemoveToken = vi.fn();
    const handle = wireTokenSearchFields(root, { keyboard: { onRemoveToken } });

    focusAt(editor, editor, editor.childNodes.length);
    const del = keydown('Delete');
    editor.dispatchEvent(del);
    expect(del.defaultPrevented).toBe(false);
    expect(onRemoveToken).not.toHaveBeenCalled();
    handle();
  });

  it('skips blank spacer nodes between the caret and the chip', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false">' +
      '<div data-token-search-editor="tickets" contenteditable="true">' +
      '<span data-token-search-text>due </span>' +
      '<span data-component="token-search-token" data-token-value="tag:client" contenteditable="false"><button type="button">tag:client</button></span>' +
      '​' +
      '<span data-token-search-text> soon</span>' +
      '</div></div>';
    document.body.append(root);
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const tail = editor.querySelectorAll('[data-token-search-text]')[1]
      .firstChild as Text;
    const onRemoveToken = vi.fn();
    const handle = wireTokenSearchFields(root, { keyboard: { onRemoveToken } });

    focusAt(editor, tail, 0);
    editor.dispatchEvent(keydown('Backspace'));
    expect(onRemoveToken).toHaveBeenCalledWith({
      id: 'tickets',
      value: 'tag:client',
      editor,
      direction: 'backward',
    });
    handle();
  });

  it('skips a blank text-span child when the caret sits in the editor', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false">' +
      '<div data-token-search-editor="tickets" contenteditable="true">' +
      '<span data-token-search-text>due </span>' +
      '<span data-component="token-search-token" data-token-value="tag:client" contenteditable="false"><button type="button">tag:client</button></span>' +
      '<span data-token-search-text>​</span>' +
      '<span data-token-search-text> soon</span>' +
      '</div></div>';
    document.body.append(root);
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const onRemoveToken = vi.fn();
    const handle = wireTokenSearchFields(root, { keyboard: { onRemoveToken } });

    // Caret directly in the editor just after the blank span (child index 3 back → the blank span).
    focusAt(editor, editor, 3);
    editor.dispatchEvent(keydown('Backspace'));
    expect(onRemoveToken).toHaveBeenCalledWith({
      id: 'tickets',
      value: 'tag:client',
      editor,
      direction: 'backward',
    });
    handle();
  });

  it('skips a blank spacer ahead of the caret for a forward (Delete) removal', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false">' +
      '<div data-token-search-editor="tickets" contenteditable="true">' +
      '<span data-token-search-text>due </span>' +
      '<span data-token-search-text>​</span>' +
      '<span data-component="token-search-token" data-token-value="tag:client" contenteditable="false"><button type="button">tag:client</button></span>' +
      '<span data-token-search-text> soon</span>' +
      '</div></div>';
    document.body.append(root);
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const lead = editor.querySelector('[data-token-search-text]')!
      .firstChild as Text;
    const onRemoveToken = vi.fn();
    const handle = wireTokenSearchFields(root, { keyboard: { onRemoveToken } });

    // Caret at the end of the leading run; a blank spacer sits before the chip.
    focusAt(editor, lead, lead.length);
    editor.dispatchEvent(keydown('Delete'));
    expect(onRemoveToken).toHaveBeenCalledWith({
      id: 'tickets',
      value: 'tag:client',
      editor,
      direction: 'forward',
    });
    handle();
  });

  it('reports an empty value for a chip that carries no token value', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false">' +
      '<div data-token-search-editor="tickets" contenteditable="true">' +
      '<span data-component="token-search-token" contenteditable="false"><button type="button">chip</button></span>' +
      '<span data-token-search-text> soon</span>' +
      '</div></div>';
    document.body.append(root);
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const tail = editor.querySelector('[data-token-search-text]')!
      .firstChild as Text;
    const onRemoveToken = vi.fn();
    const handle = wireTokenSearchFields(root, { keyboard: { onRemoveToken } });

    focusAt(editor, tail, 0);
    editor.dispatchEvent(keydown('Backspace'));
    expect(onRemoveToken).toHaveBeenCalledWith({
      id: 'tickets',
      value: '',
      editor,
      direction: 'backward',
    });
    handle();
  });

  it('does not treat a bare text run adjacent to the caret as a chip', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false">' +
      '<div data-token-search-editor="tickets" contenteditable="true">' +
      '<span data-component="token-search-token" data-token-value="tag:client" contenteditable="false"><button type="button">tag:client</button></span>' +
      'AND<span data-token-search-text> soon</span>' +
      '</div></div>';
    document.body.append(root);
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const tail = editor.querySelector('[data-token-search-text]')!
      .firstChild as Text;
    const onRemoveToken = vi.fn();
    const handle = wireTokenSearchFields(root, { keyboard: { onRemoveToken } });

    focusAt(editor, tail, 0);
    const back = keydown('Backspace');
    editor.dispatchEvent(back);
    expect(back.defaultPrevented).toBe(false);
    expect(onRemoveToken).not.toHaveBeenCalled();
    handle();
  });

  it('moves the caret past a chip that ends the editor', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div data-component="token-search-field" data-token-search-id="tickets" data-disabled="false">' +
      '<div data-token-search-editor="tickets" contenteditable="true">' +
      '<span data-token-search-text>due </span>' +
      '<span data-component="token-search-token" data-token-value="tag:client" contenteditable="false"><button type="button">tag:client</button></span>' +
      '</div></div>';
    document.body.append(root);
    const editor = root.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const lead = editor.querySelector('[data-token-search-text]')!
      .firstChild as Text;
    const handle = wireTokenSearchFields(root, {
      keyboard: { removeAdjacentToken: false },
    });

    focusAt(editor, lead, lead.length);
    const event = keydown('ArrowRight');
    editor.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    handle();
  });
});
