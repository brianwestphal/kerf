import { delegate } from 'kerfjs';

import { placeTokenSearchCaret, readTokenSearchField } from './token-search-field.js';

export interface TokenSearchSubmit {
  id: string;
  editor: HTMLElement;
}

export interface WireTokenSearchFieldsOptions {
  onSubmit: (submission: TokenSearchSubmit) => void;
}

interface PendingTokenDeletion {
  id: string;
  offset: number;
  tokenCount: number;
}

function editorFromEvent(root: HTMLElement, event: Event): HTMLElement | undefined {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const editor = target.closest<HTMLElement>('[data-token-search-editor]');
  return editor && root.contains(editor) ? editor : undefined;
}

function caretQueryOffset(editor: HTMLElement): number | undefined {
  const selection = editor.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const selectionRange = selection.getRangeAt(0);
  if (!editor.contains(selectionRange.startContainer)) return;
  const prefixRange = editor.ownerDocument.createRange();
  prefixRange.selectNodeContents(editor);
  prefixRange.setEnd(selectionRange.startContainer, selectionRange.startOffset);
  const prefix = editor.ownerDocument.createElement('div');
  prefix.append(prefixRange.cloneContents());
  return readTokenSearchField(prefix).query.length;
}

function replacementEditor(root: HTMLElement, id: string): HTMLElement | undefined {
  return [...root.querySelectorAll<HTMLElement>('[data-token-search-editor]')]
    .find((editor) => editor.dataset.tokenSearchEditor === id);
}

/** Keep TokenSearchField wrapping, submit Enter, and preserve its caret across controlled token deletion. */
export function wireTokenSearchFields(root: HTMLElement, { onSubmit }: WireTokenSearchFieldsOptions) {
  const pending = new WeakMap<HTMLElement, PendingTokenDeletion>();
  const onBeforeInput = (event: Event) => {
    const inputEvent = event as InputEvent;
    const editor = editorFromEvent(root, event);
    if (!editor || !inputEvent.inputType.startsWith('delete') || editor.ownerDocument.activeElement !== editor) return;
    const field = editor.closest<HTMLElement>('[data-component="token-search-field"]');
    const id = field?.dataset.tokenSearchId;
    const offset = caretQueryOffset(editor);
    if (!id || offset === undefined || field?.dataset.disabled === 'true') return;
    pending.set(editor, {
      id,
      offset,
      tokenCount: editor.querySelectorAll('[data-component="token-search-token"]').length,
    });
  };
  const onInput = (event: Event) => {
    const editor = editorFromEvent(root, event);
    if (!editor) return;
    const deletion = pending.get(editor);
    pending.delete(editor);
    if (!deletion || editor.querySelectorAll('[data-component="token-search-token"]').length >= deletion.tokenCount) return;
    editor.ownerDocument.defaultView!.requestAnimationFrame(() => {
      const replacement = replacementEditor(root, deletion.id);
      if (!replacement) return;
      const active = replacement.ownerDocument.activeElement;
      if (active !== editor && active !== replacement && active !== replacement.ownerDocument.body) return;
      placeTokenSearchCaret(replacement, deletion.offset);
    });
  };
  root.addEventListener('beforeinput', onBeforeInput, true);
  root.addEventListener('input', onInput, true);

  const stopSubmit = delegate(root, 'keydown', '[data-token-search-editor]', (event, element) => {
    const keyboardEvent = event as KeyboardEvent;
    const editor = element as HTMLElement;
    const field = editor.closest<HTMLElement>('[data-component="token-search-field"]');
    const id = field?.dataset.tokenSearchId;
    if (keyboardEvent.key !== 'Enter' || keyboardEvent.isComposing || !id || field?.dataset.disabled === 'true') return;
    keyboardEvent.preventDefault();
    onSubmit({ id, editor });
  });
  return () => {
    root.removeEventListener('beforeinput', onBeforeInput, true);
    root.removeEventListener('input', onInput, true);
    stopSubmit();
  };
}
