// KF-XJPZJ3: undo/redo transitions no other editing test walks — an undo
// over an invalid inspector draft, and an undo that removes the selected node.
// (The 200-entry cap is covered on History in edits.test.ts, and undo across
// opening a composed document in views.test.ts.)
import { describe, expect, it } from 'vitest';

import { findNode } from '../../../src/editor/model/document.js';
import {
  choose,
  click,
  field,
  open,
  showAllProperties,
  TOOLBAR,
  type,
} from './editing-harness.js';

const undoDisabled = (root: HTMLElement) =>
  field(root, '[data-action="editor-undo"]').hasAttribute('disabled');

describe('undo sequences', () => {
  it('drops an invalid field draft and its message when undo restores the document', () => {
    const { root, editor, node } = open();
    choose(field(root, '[data-editor-prop="tone"]'), 'danger');
    const edited = editor.document.value;
    // An invalid name is refused: the document keeps its name and the field
    // explains why, without a history entry.
    type(field(root, '[data-editor-name]'), 'Send Button');
    expect(editor.document.value).toBe(edited);
    expect(field(root, '[data-editor-name]').textContent).toContain(
      'camelCase',
    );
    click(root, 'editor-undo');
    expect(node()?.props?.tone).not.toBe('danger');
    expect(node()?.name).toBe('composeButton');
    // The refusal belonged to the draft, which undo discards with it.
    expect(field(root, '[data-editor-name]').textContent).not.toContain(
      'camelCase',
    );
    click(root, 'editor-redo');
    expect(node()?.props?.tone).toBe('danger');
    expect(node()?.name).toBe('composeButton');
  });

  // KF-0Y88XZ: undo discards the refused text with its message, so the field
  // shows the document's name again rather than one the document lacks.
  it('shows the document value again in a field whose invalid draft undo discarded', () => {
    const { root } = open();
    choose(field(root, '[data-editor-prop="tone"]'), 'danger');
    type(field(root, '[data-editor-name]'), 'Send Button');
    click(root, 'editor-undo');
    expect(
      field(root, '[data-editor-name]').querySelector('input')!.value,
    ).toBe('composeButton');
    // Redo restores the edit, not the refused draft.
    click(root, 'editor-redo');
    expect(
      field(root, '[data-editor-name]').querySelector('input')!.value,
    ).toBe('composeButton');
  });

  it('clears the inspector when undo removes the selected node, and redo brings it back', () => {
    const { root, editor } = open(TOOLBAR);
    choose(field(root, '[data-editor-add="zone"]'), 'trailing');
    choose(field(root, '[data-editor-add="component"]'), '@kerfjs/ui:button');
    click(root, 'editor-add-child');
    const selected = editor.selection.value;
    const id = selected?.kind === 'node' ? selected.id : '';
    expect(findNode(editor.document.value, id)).toBeDefined();
    expect(root.querySelector('[data-editor-name]')).not.toBeNull();
    // Its controls show on the All properties page (KF-QWDPM3).
    showAllProperties(root);
    expect(root.querySelector('[data-editor-prop]')).not.toBeNull();

    click(root, 'editor-undo');
    expect(findNode(editor.document.value, id)).toBeUndefined();
    // The selection names a node that no longer exists: nothing is inspected
    // and no node-scoped control acts on it.
    expect(root.querySelector('[data-editor-name]')).toBeNull();
    expect(root.querySelector('[data-editor-prop]')).toBeNull();
    expect(undoDisabled(root)).toBe(true);

    click(root, 'editor-redo');
    expect(findNode(editor.document.value, id)).toBeDefined();
    // The selection still names it, so the inspector returns to it.
    expect(root.querySelector('[data-editor-name]')).not.toBeNull();
  });
});
