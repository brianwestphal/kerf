import { afterEach, describe, expect, it, vi } from 'vitest';

import { wireTokenSearchFields } from '../../src/wire-token-search-fields.js';

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
