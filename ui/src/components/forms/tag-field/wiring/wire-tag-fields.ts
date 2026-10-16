import { delegate, delegateCapture } from 'kerfjs';

import {
  placeSearchFieldCaret,
  readSearchField,
} from '../../search-field/search-field.js';
import { wireSearchFields } from '../../search-field/wiring/wire-search-fields.js';
import { tagFieldActions } from '../tag-field.js';

/** Reported to {@link WireTagFieldsOptions.onChange} with the field's next tags. */
export interface TagFieldChange {
  id: string;
  tags: string[];
}

/** Why a typed value did not become a tag. */
export type TagFieldRejection = 'duplicate' | 'max' | 'invalid';

export interface WireTagFieldsOptions {
  /** Apply the next tag list to your state, then re-render the TagField. */
  onChange: (change: TagFieldChange) => void;
  /** Report a value that was not added (to show an `error`, for example). */
  onReject?: (rejection: {
    id: string;
    value: string;
    reason: TagFieldRejection;
  }) => void;
  /** Keys besides Enter that add the typed tag (default `[',']`). */
  delimiters?: readonly string[];
  /** Accept a tag already in the list (default false). */
  allowDuplicates?: boolean;
  /**
   * Clean up a typed value, or return `undefined` to refuse it as invalid
   * (default: trim, refusing an empty value).
   */
  normalize?: (value: string, id: string) => string | undefined;
  /** Add the typed text when focus leaves the editor for anything but its own chips (default true). */
  commitOnBlur?: boolean;
}

const defaultNormalize = (value: string) => value.trim() || undefined;

/** The field's id and a chip's value: attributes the render always writes. */
const idOf = (field: HTMLElement) => field.dataset.tagFieldId!;
const tokenOf = (element: HTMLElement) => element.dataset.tokenValue!;

function tagFieldOf(element: Element): HTMLElement | null {
  return element.closest<HTMLElement>('[data-component="tag-field"]');
}

function tagsOf(field: HTMLElement): string[] {
  return [
    ...field.querySelectorAll<HTMLElement>(
      '[data-component="search-field-token"]',
    ),
  ].map(tokenOf);
}

function editorOf(field: HTMLElement): HTMLElement | null {
  return field.querySelector<HTMLElement>('[data-tag-field-editor]');
}

/** The text before the caret in an editor, or undefined without a caret in it. */
function textBeforeCaret(editor: HTMLElement): string | undefined {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed)
    return undefined;
  const caret = selection.getRangeAt(0);
  if (!editor.contains(caret.startContainer)) return undefined;
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.setEnd(caret.startContainer, caret.startOffset);
  const fragment = range.cloneContents();
  for (const chip of fragment.querySelectorAll(
    '[data-component="search-field-token"]',
  ))
    chip.remove();
  return fragment.textContent!.replaceAll('​', '');
}

/**
 * Wire every TagField under `root`: Enter or a delimiter adds the typed text
 * as a tag (several at once when pasted text holds delimiters), leaving focus
 * adds it too, a chip's × or Backspace at the start removes a tag, a chip's
 * label moves it back into the editor to edit, the clear button empties the
 * list, and ArrowLeft / ArrowRight move between the chips and the editor.
 * Duplicates, the field's `max`, and `normalize` are enforced before
 * `onChange`. It also wires the SearchField editor mechanics the TagField is
 * built on. Returns a disposer.
 */
export function wireTagFields(
  root: HTMLElement,
  {
    onChange,
    onReject,
    delimiters = [','],
    allowDuplicates = false,
    normalize = defaultNormalize,
    commitOnBlur = true,
  }: WireTagFieldsOptions,
): () => void {
  // Text to place in an editor once the app re-renders it (editing a tag).
  const pendingEdits = new Map<string, string>();

  const fieldById = (id: string) =>
    root.querySelector<HTMLElement>(`[data-tag-field-id="${CSS.escape(id)}"]`);

  const change = (id: string, tags: string[]) => {
    // A tag change rebuilds the editor, which drops focus from the old one:
    // return the caret to the new editor when the person was typing in it.
    const typing = fieldById(id)
      ?.querySelector('[data-tag-field-editor]')
      ?.contains(document.activeElement);
    onChange({ id, tags });
    const text = pendingEdits.get(id);
    pendingEdits.delete(id);
    if (text === undefined && !typing) return;
    globalThis.queueMicrotask(() => {
      const field = fieldById(id);
      const editor = field && editorOf(field);
      if (!editor) return;
      if (text === undefined) {
        if (!editor.contains(document.activeElement))
          placeSearchFieldCaret(editor);
        return;
      }
      const span =
        editor.querySelector<HTMLElement>(
          '[data-search-field-text]:last-of-type',
        ) ?? editor;
      span.textContent = text;
      editor.dispatchEvent(
        new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
      );
      placeSearchFieldCaret(editor);
    });
  };

  /** Add the editor's text as tags; returns whether any text was taken. */
  const commit = (field: HTMLElement, editor: HTMLElement): boolean => {
    const id = idOf(field);
    const text = readSearchField(editor).query;
    const parts = delimiters.reduce<string[]>(
      (pieces, delimiter) => pieces.flatMap((piece) => piece.split(delimiter)),
      [text],
    );
    const tags = tagsOf(field);
    const max =
      field.dataset.max === undefined ? Infinity : Number(field.dataset.max);
    let added = false;
    for (const part of parts) {
      if (part.trim() === '') continue;
      const value = normalize(part, id);
      if (value === undefined) {
        onReject?.({ id, value: part.trim(), reason: 'invalid' });
        continue;
      }
      if (!allowDuplicates && tags.includes(value)) {
        onReject?.({ id, value, reason: 'duplicate' });
        continue;
      }
      if (tags.length >= max) {
        onReject?.({ id, value, reason: 'max' });
        continue;
      }
      tags.push(value);
      added = true;
    }
    if (added) change(id, tags);
    return added;
  };

  // The SearchField editor mechanics (empty-text normalization, the
  // placeholder) the TagField is built on; its keys are handled below.
  const stopSearchFields = wireSearchFields(root, { collapsible: false });

  const stopKeys = delegateCapture(
    root,
    'keydown',
    '[data-component="tag-field"]',
    (event, element) => {
      const key = event as KeyboardEvent;
      if (key.isComposing) return;
      const field = element as HTMLElement;
      const editor = editorOf(field);
      if (!editor) return;
      const target = key.target as HTMLElement;
      const chips = [
        ...field.querySelectorAll<HTMLElement>(
          `[data-action="${tagFieldActions.edit}"]`,
        ),
      ];
      const forward =
        globalThis.getComputedStyle(field).direction === 'rtl'
          ? 'ArrowLeft'
          : 'ArrowRight';
      const backward = forward === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight';
      const index = chips.indexOf(target);
      // The chips sit inside the editor, so test for a chip first.
      if (index === -1 && (target === editor || editor.contains(target))) {
        if (key.key === 'Enter' || delimiters.includes(key.key)) {
          key.preventDefault();
          commit(field, editor);
          return;
        }
        // Tab may move focus onto a chip inside the editor (which a blur
        // would not count as leaving), so it adds the typed text itself.
        if (key.key === 'Tab' && commitOnBlur) {
          commit(field, editor);
          return;
        }
        if (key.key === 'Backspace' && textBeforeCaret(editor) === '') {
          // Remove the tag just before the caret: the chip ahead of the
          // text run the caret is in.
          const run = globalThis
            .getSelection()
            ?.getRangeAt(0)
            .startContainer.parentElement?.closest('[data-search-field-text]');
          const chip = (run?.previousElementSibling ??
            editor.querySelector(
              '[data-component="search-field-token"]:last-of-type',
            )) as HTMLElement | null;
          if (!chip?.matches('[data-component="search-field-token"]')) return;
          key.preventDefault();
          const value = tokenOf(chip);
          change(
            idOf(field),
            tagsOf(field).filter((tag) => tag !== value),
          );
          return;
        }
        if (
          key.key === backward &&
          chips.length > 0 &&
          textBeforeCaret(editor) === ''
        ) {
          key.preventDefault();
          chips.at(-1)!.focus();
        }
        return;
      }
      if (index === -1) return;
      if (key.key === backward) {
        key.preventDefault();
        chips[Math.max(0, index - 1)]!.focus();
      } else if (key.key === forward) {
        key.preventDefault();
        if (index === chips.length - 1) placeSearchFieldCaret(editor);
        else chips[index + 1]!.focus();
      } else if (key.key === 'Backspace' || key.key === 'Delete') {
        key.preventDefault();
        const value = tokenOf(target);
        change(
          idOf(field),
          tagsOf(field).filter((tag) => tag !== value),
        );
        globalThis.queueMicrotask(() => {
          const next = [
            ...field.querySelectorAll<HTMLElement>(
              `[data-action="${tagFieldActions.edit}"]`,
            ),
          ];
          const live = editorOf(field);
          if (next.length === 0 && live) placeSearchFieldCaret(live);
          else next[Math.min(index, next.length - 1)]?.focus();
        });
      }
    },
  );

  const stopPaste = delegate(
    root,
    'input',
    '[data-tag-field-editor]',
    (event, element) => {
      const input = event as InputEvent;
      if (input.inputType !== 'insertFromPaste') return;
      const editor = element as HTMLElement;
      const field = tagFieldOf(editor);
      if (field) commit(field, editor);
    },
  );

  const stopBlur = delegate(
    root,
    'focusout',
    '[data-tag-field-editor]',
    (event, element) => {
      if (!commitOnBlur) return;
      const editor = element as HTMLElement;
      const field = tagFieldOf(editor);
      const next = (event as FocusEvent).relatedTarget;
      // Focus moving within the editor (onto one of its chips) keeps editing.
      if (!field || (next instanceof Node && editor.contains(next))) return;
      commit(field, editor);
    },
  );

  const stopClicks = delegate(
    root,
    'click',
    `[data-component="tag-field"] [data-action]`,
    (_event, element) => {
      const button = element as HTMLElement;
      const field = tagFieldOf(button);
      if (!field) return;
      const id = idOf(field);
      const value = tokenOf(button);
      switch (button.dataset.action) {
        case tagFieldActions.remove:
          change(
            id,
            tagsOf(field).filter((tag) => tag !== value),
          );
          globalThis.queueMicrotask(() => {
            const live = editorOf(field);
            if (live) placeSearchFieldCaret(live);
          });
          return;
        case tagFieldActions.edit:
          pendingEdits.set(id, value);
          change(
            id,
            tagsOf(field).filter((tag) => tag !== value),
          );
          return;
        case tagFieldActions.clear:
          change(id, []);
          globalThis.queueMicrotask(() => {
            const live = editorOf(field);
            if (live) placeSearchFieldCaret(live);
          });
          return;
      }
    },
  );

  return () => {
    stopSearchFields();
    stopKeys();
    stopPaste();
    stopBlur();
    stopClicks();
  };
}
