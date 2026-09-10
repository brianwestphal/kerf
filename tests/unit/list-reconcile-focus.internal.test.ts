import { afterEach, describe, expect, it } from 'vitest';

import { captureFocus, restoreFocus } from '../../src/list-reconcile-focus.js';

afterEach(() => {
  document.body.innerHTML = '';
  document.getSelection()?.removeAllRanges();
});

describe('list reconcile focus snapshots', () => {
  it('restores an input selection even when the input never lost focus', () => {
    const parent = document.createElement('div');
    const input = document.createElement('input');
    input.value = 'hello';
    parent.appendChild(input);
    document.body.appendChild(parent);
    input.focus();
    input.setSelectionRange(1, 4);

    const snapshot = captureFocus(parent);
    expect(snapshot).not.toBeNull();
    input.setSelectionRange(5, 5);
    restoreFocus(snapshot!);

    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(4);
  });

  it('restores exact contenteditable boundary nodes and offsets after retargeting', () => {
    const parent = document.createElement('div');
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    editable.textContent = 'rich text';
    parent.appendChild(editable);
    document.body.appendChild(parent);
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    editable.focus();

    const text = editable.firstChild!;
    const original = document.createRange();
    original.setStart(text, 2);
    original.setEnd(text, 6);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(original);

    const snapshot = captureFocus(parent);
    expect(snapshot).not.toBeNull();
    const retargeted = document.createRange();
    retargeted.selectNodeContents(parent);
    retargeted.collapse(true);
    selection.removeAllRanges();
    selection.addRange(retargeted);
    restoreFocus(snapshot!);

    expect(document.activeElement).toBe(editable);
    expect(selection.anchorNode).toBe(text);
    expect(selection.anchorOffset).toBe(2);
    expect(selection.focusNode).toBe(text);
    expect(selection.focusOffset).toBe(6);
  });

  it('does not restore a snapshot whose focused element was removed', () => {
    const parent = document.createElement('div');
    const input = document.createElement('input');
    parent.appendChild(input);
    document.body.appendChild(parent);
    input.focus();
    const snapshot = captureFocus(parent)!;

    input.remove();
    expect(() => restoreFocus(snapshot)).not.toThrow();
    expect(document.activeElement).not.toBe(input);
  });
});
