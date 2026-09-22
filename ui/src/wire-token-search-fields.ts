import { delegate, delegateCapture, type Signal, signal } from 'kerfjs';

import {
  placeTokenSearchCaret,
  readTokenSearchField,
} from './token-search-field.js';

export interface TokenSearchSubmit {
  id: string;
  editor: HTMLElement;
}

/** Reported to {@link WireTokenSearchFieldsOptions.onEdit} on every editor input. */
export interface TokenSearchEdit extends TokenSearchSubmit {
  /**
   * The `InputEvent` that mutated the editor — read `event.inputType` / `event.data`
   * to gate commit behavior (e.g. only parse a chip on whitespace-terminated input)
   * without keeping a separate `input` listener.
   */
  event: InputEvent;
}

/** Reported when adjacent-token keyboard deletion asks the app to drop a chip. */
export interface TokenSearchTokenRemoval {
  id: string;
  /** The `data-token-value` of the token the app should remove from its state. */
  value: string;
  editor: HTMLElement;
  /** `'backward'` = the token before the caret (Backspace); `'forward'` = after (Delete). */
  direction: 'backward' | 'forward';
}

/**
 * Opt-in keyboard behavior for the atomic token chips. Off unless `keyboard` is
 * set; each piece defaults on once opted in. The helper never mutates app state:
 * a removal is reported through {@link TokenSearchKeyboardOptions.onRemoveToken}
 * for the caller to apply, while caret movement past a chip is a pure ephemeral
 * mechanic the helper performs itself.
 */
interface TokenSearchKeyboardBaseOptions {
  /**
   * From a collapsed caret with no selection, Backspace removes the token
   * immediately before it and Delete the token immediately after — reported via
   * `onRemoveToken` — instead of deleting a character. Default: true.
   */
  /**
   * ArrowRight moves the caret past a trailing atomic token so text typed next
   * lands after the chip. Default: true.
   */
  moveCaretPastToken?: boolean;
  /** Apply the reported removal to your controlled state, then re-render. */
}

export type TokenSearchKeyboardOptions = TokenSearchKeyboardBaseOptions &
  (
    | {
        removeAdjacentToken?: true;
        /** Apply the reported removal to your controlled state, then re-render. */
        onRemoveToken: (removal: TokenSearchTokenRemoval) => void;
      }
    | { removeAdjacentToken: false; onRemoveToken?: never }
  );

/**
 * Managed collapsible behavior for the iconic TokenSearchField. Every piece is on
 * by default; disable a specific one to own it in the app. Provide `signals` to
 * drive app-owned `expanded` signals per field id instead of helper-created ones.
 */
export interface TokenSearchCollapsibleOptions {
  /** Expand the field and focus its editor when the iconic trigger is activated. Default: true. */
  expandOnActivate?: boolean;
  /** Collapse the field when focus leaves it while it is empty. Default: true. */
  collapseOnEmptyBlur?: boolean;
  /** Collapse an empty field on Escape and restore focus to its trigger. Default: true. */
  collapseOnEscape?: boolean;
  /** Focus the editor on expand/controlled clear and the trigger on Escape-collapse. Default: true. */
  manageFocus?: boolean;
  /**
   * Keep an empty field expanded when focus moves to a caller-owned surface
   * rendered outside the field — a suggestions dropdown, date picker, or help
   * popover shown beside it. Return true for any focus target that must NOT
   * trigger collapse-on-empty-blur. An element carrying `data-token-search-keep-open`
   * (or any node inside one) is always exempt, so this predicate is only needed
   * for surfaces you cannot mark declaratively.
   */
  keepOpenOn?: (target: Node | null) => boolean;
  /** App-owned `expanded` signals keyed by field id; adopted instead of helper-created. */
  signals?: Readonly<Record<string, Signal<boolean>>>;
}

export interface WireTokenSearchFieldsOptions {
  onSubmit?: (submission: TokenSearchSubmit) => void;
  /** Fired on every editor `input`, after the browser mutates it, so a caller can drop its own `input` listener. */
  onEdit?: (edit: TokenSearchEdit) => void;
  /** Managed collapsible transient behavior. `true`/omitted = on with defaults; `false` = fully off. */
  collapsible?: boolean | TokenSearchCollapsibleOptions;
  /** Opt-in atomic-chip keyboard behavior (off by default). */
  keyboard?: false | TokenSearchKeyboardOptions;
}

/**
 * The value returned from {@link wireTokenSearchFields}: call it (or `dispose()`) to
 * tear down. When collapsible behavior is managed, it also exposes the transient
 * `expanded` state per field id so the app can read it in render, hand in its own
 * signal, or drive it imperatively.
 */
export interface TokenSearchFieldsHandle {
  (): void;
  dispose(): void;
  /** The managed `expanded` signal for a field id (adopted or helper-created); undefined when unmanaged. */
  expanded(id: string): Signal<boolean> | undefined;
  /** Expand the field (and, when focus is managed, focus its editor). */
  open(id: string): void;
  /** Collapse the field (and, when focus is managed, restore focus to its trigger). */
  close(id: string): void;
}

interface PendingTokenDeletion {
  id: string;
  offset: number;
  tokenCount: number;
  selectedAll: boolean;
}

function editorFromEvent(
  root: HTMLElement,
  event: Event,
): HTMLElement | undefined {
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

function replacementEditor(
  root: HTMLElement,
  id: string,
): HTMLElement | undefined {
  return [
    ...root.querySelectorAll<HTMLElement>('[data-token-search-editor]'),
  ].find((editor) => editor.dataset.tokenSearchEditor === id);
}

function editorIsEmpty(editor: HTMLElement): boolean {
  const value = readTokenSearchField(editor);
  return value.query.length === 0 && value.tokens.length === 0;
}

/** Whether the active selection covers all logical text and tokens in the editor. */
function selectionCoversEditor(editor: HTMLElement): boolean {
  // onBeforeInput calls this only after caretQueryOffset verified a live range.
  const selected = editor.ownerDocument.getSelection()!.getRangeAt(0);
  if (selected.collapsed || !editor.contains(selected.commonAncestorContainer))
    return false;
  // Browser select-all ranges are not structurally identical across platforms:
  // some use editor child offsets while others start/end inside the first/last
  // text nodes. Compare the selected logical value instead of DOM boundaries.
  const selectedHost = editor.ownerDocument.createElement('div');
  selectedHost.append(selected.cloneContents());
  const fullValue = readTokenSearchField(editor);
  const selectedValue = readTokenSearchField(selectedHost);
  return (
    selectedValue.query === fullValue.query &&
    selectedValue.tokens.length === fullValue.tokens.length &&
    selectedValue.tokens.every(
      (token, index) => token.value === fullValue.tokens[index]?.value,
    )
  );
}

const TOKEN_SELECTOR = '[data-component="token-search-token"]';
const TEXT_SELECTOR = '[data-token-search-text]';
const stripZwsp = (text: string): string => text.replaceAll('​', '');

/**
 * A `contenteditable` host emptied by select-all + Delete (or Backspace) leaves a
 * bogus `<br>` in every engine: it renders as a stray newline and `readTokenSearchField`
 * reads it back as a space. Strip those line breaks after a delete, and when the field
 * is otherwise empty (no chips, no visible text) restore the canonical empty text span
 * and place the caret in it so typing resumes cleanly. Called only after the browser has
 * applied the delete, so an ordinary partial delete is never touched.
 */
function normalizeEmptiedEditor(
  editor: HTMLElement,
  selectedAll = false,
): void {
  const lineBreaks = editor.querySelectorAll('br');
  if (lineBreaks.length === 0 && !selectedAll) return;
  for (const lineBreak of lineBreaks) lineBreak.remove();
  if (!selectedAll && editor.querySelector(TOKEN_SELECTOR)) return;
  if (!selectedAll && stripZwsp(editor.textContent ?? '') !== '') return;
  const doc = editor.ownerDocument;
  const span = doc.createElement('span');
  span.setAttribute('data-token-search-text', '');
  span.setAttribute('data-empty', 'true');
  editor.replaceChildren(span);
  if (doc.activeElement !== editor) return;
  // The editor is the focused, connected editing host, so a selection exists.
  const selection = doc.getSelection()!;
  const range = doc.createRange();
  range.setStart(span, 0);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** The collapsed, in-editor caret range, or undefined when there is a selection or none. */
function collapsedCaret(editor: HTMLElement): Range | undefined {
  const selection = editor.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (!range.collapsed || !editor.contains(range.startContainer)) return;
  return range;
}

/** The direct child of `editor` that contains `node` (or `node` itself), else null. */
function topBlock(editor: HTMLElement, node: Node): Node | null {
  let current: Node = node;
  while (current.parentNode && current.parentNode !== editor)
    current = current.parentNode;
  return current.parentNode === editor ? current : null;
}

/** A text node or text span holding no visible character (only zero-width spacers). */
function isBlankText(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE)
    return stripZwsp((node as CharacterData).data) === '';
  return (
    node instanceof Element &&
    node.matches(TEXT_SELECTOR) &&
    stripZwsp(node.textContent ?? '') === ''
  );
}

/** The nearest sibling block on `direction`, skipping blank text spacers. */
function meaningfulSibling(
  block: Node,
  direction: 'backward' | 'forward',
): Node | null {
  let sibling =
    direction === 'backward' ? block.previousSibling : block.nextSibling;
  while (sibling && isBlankText(sibling))
    sibling =
      direction === 'backward' ? sibling.previousSibling : sibling.nextSibling;
  return sibling;
}

/** The node immediately on `direction` of the caret, only when no visible character separates them. */
function caretSideNode(
  editor: HTMLElement,
  range: Range,
  direction: 'backward' | 'forward',
): Node | null {
  const { startContainer: container, startOffset: offset } = range;
  if (container.nodeType === Node.TEXT_NODE) {
    const text = (container as CharacterData).data;
    const side =
      direction === 'backward' ? text.slice(0, offset) : text.slice(offset);
    if (stripZwsp(side).length > 0) return null;
    // An in-editor text node always has a top block (itself or its wrapping span).
    return meaningfulSibling(topBlock(editor, container)!, direction);
  }
  const child = container.childNodes[
    direction === 'backward' ? offset - 1 : offset
  ] as Node | undefined;
  if (child) {
    // `child` is a descendant of the in-editor caret container, so it has a top block.
    const block = topBlock(editor, child)!;
    return isBlankText(child) ? meaningfulSibling(block, direction) : block;
  }
  const block = topBlock(editor, container);
  return block ? meaningfulSibling(block, direction) : null;
}

/** The atomic token chip adjacent to a collapsed caret on `direction`, if any. */
function adjacentToken(
  editor: HTMLElement,
  direction: 'backward' | 'forward',
): HTMLElement | undefined {
  const range = collapsedCaret(editor);
  if (!range) return;
  const node = caretSideNode(editor, range, direction);
  if (!node) return;
  const base = node instanceof Element ? node : node.parentElement;
  const chip = base?.closest<HTMLElement>(TOKEN_SELECTOR) ?? null;
  return chip && editor.contains(chip) ? chip : undefined;
}

/** Move the caret to just after an atomic token chip so typed text lands after it.
 *  Only reached after {@link collapsedCaret} already found a live selection, and the
 *  chip is a direct block of the editor. */
function placeCaretAfterToken(editor: HTMLElement, chip: HTMLElement): void {
  const selection = editor.ownerDocument.getSelection()!;
  const range = editor.ownerDocument.createRange();
  range.setStartAfter(topBlock(editor, chip)!);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  editor.focus({ preventScroll: true });
}

/**
 * Wire every TokenSearchField under `root`: submit on Enter, preserve the caret across
 * controlled token deletion, and (by default) manage the collapsible field's transient
 * expand/collapse/focus. Returns a {@link TokenSearchFieldsHandle} — a disposer that also
 * exposes the managed `expanded` state per field id.
 */
export function wireTokenSearchFields(
  root: HTMLElement,
  {
    onSubmit,
    onEdit,
    collapsible = true,
    keyboard = false,
  }: WireTokenSearchFieldsOptions = {},
): TokenSearchFieldsHandle {
  const managed = collapsible !== false;
  const config = typeof collapsible === 'object' ? collapsible : {};
  const expandOnActivate = managed && (config.expandOnActivate ?? true);
  const collapseOnEmptyBlur = managed && (config.collapseOnEmptyBlur ?? true);
  const collapseOnEscape = managed && (config.collapseOnEscape ?? true);
  const manageFocus = managed && (config.manageFocus ?? true);
  const keepOpenOn = config.keepOpenOn;
  const keyboardOn = keyboard !== false;
  const keyboardConfig = typeof keyboard === 'object' ? keyboard : undefined;
  const removeAdjacentToken =
    keyboardOn && (keyboardConfig?.removeAdjacentToken ?? true);
  const moveCaretPastToken =
    keyboardOn && (keyboardConfig?.moveCaretPastToken ?? true);
  const onRemoveToken = keyboardConfig?.onRemoveToken;
  const adopted = config.signals ?? {};
  const created = new Map<string, Signal<boolean>>();
  let disposed = false;

  /** True when focus moving to `element` should keep an empty field expanded. */
  const isExemptTarget = (element: Element | null): boolean => {
    if (!element) return false;
    if (element.closest('[data-token-search-keep-open]')) return true;
    return keepOpenOn ? keepOpenOn(element) : false;
  };

  const signalFor = (id: string): Signal<boolean> => {
    const own = adopted[id];
    if (own) return own;
    let field = created.get(id);
    if (!field) {
      field = signal(false);
      created.set(id, field);
    }
    return field;
  };
  const setExpanded = (id: string, next: boolean) => {
    const state = signalFor(id);
    if (state.value !== next) state.value = next;
  };
  const view = () => root.ownerDocument.defaultView!;
  const focusAfterRender = (id: string, selector: string) => {
    view().requestAnimationFrame(() => {
      if (disposed) return;
      const target = root.querySelector<HTMLElement>(
        `[data-component="token-search-field"][data-token-search-id="${CSS.escape(id)}"] ${selector}`,
      );
      if (!target) return;
      if (target.matches('[data-token-search-editor]'))
        placeTokenSearchCaret(target);
      else target.focus();
    });
  };
  const openField = (id: string) => {
    setExpanded(id, true);
    if (manageFocus) focusAfterRender(id, '[data-token-search-editor]');
  };
  const closeField = (id: string) => {
    setExpanded(id, false);
    if (manageFocus) focusAfterRender(id, '.kui-token-search__expand');
  };

  const clearing = new Set<string>();
  const pending = new Map<string, PendingTokenDeletion>();
  const deleting = new Map<string, () => void>();
  const selectAllIntents = new WeakSet<HTMLElement>();
  // editorFromEvent's selector guarantees this data attribute is present.
  const intentId = (editor: HTMLElement): string =>
    editor.dataset.tokenSearchEditor!;
  const captureDeletion = (editor: HTMLElement, selectedAll?: boolean) => {
    if (editor.ownerDocument.activeElement !== editor) return;
    const field = editor.closest<HTMLElement>(
      '[data-component="token-search-field"]',
    );
    const id = field?.dataset.tokenSearchId;
    const offset = selectedAll ? 0 : caretQueryOffset(editor);
    if (!id || offset === undefined || field?.dataset.disabled === 'true')
      return;
    pending.set(id, {
      id,
      offset,
      tokenCount: editor.querySelectorAll(
        '[data-component="token-search-token"]',
      ).length,
      selectedAll: selectedAll ?? selectionCoversEditor(editor),
    });
  };
  const onBeforeInput = (event: Event) => {
    const editor = editorFromEvent(root, event);
    if (editor && (event as InputEvent).inputType.startsWith('delete'))
      captureDeletion(editor);
  };
  const restoreDeletion = (
    editor: HTMLElement,
    deletion: PendingTokenDeletion,
  ) => {
    deleting.get(deletion.id)?.();
    const stop = () => {
      observer.disconnect();
      view().clearTimeout(timeout);
      deleting.delete(deletion.id);
    };
    const restore = () => {
      const replacement = replacementEditor(root, deletion.id);
      // A native input can drain microtasks between capture and bubble listeners.
      // Wait for the actual replacement, including one rendered by a later listener.
      if (!replacement || replacement === editor) return;
      stop();
      const active = replacement.ownerDocument.activeElement;
      if (
        active !== editor &&
        active !== replacement &&
        active !== replacement.ownerDocument.body
      )
        return;
      placeTokenSearchCaret(replacement, deletion.offset);
    };
    const observer = new MutationObserver(restore);
    observer.observe(root, { childList: true, subtree: true });
    // The input task owns synchronous controlled rendering. Expiration only
    // disconnects observation; it cannot move a later selection or steal focus.
    const timeout = view().setTimeout(stop, 0);
    deleting.set(deletion.id, stop);
  };
  const onInput = (event: Event) => {
    const editor = editorFromEvent(root, event);
    if (!editor) return;
    const editorId = intentId(editor);
    const inputType = (event as InputEvent).inputType;
    if (!inputType.startsWith('delete')) selectAllIntents.delete(editor);
    const deletion = pending.get(editorId);
    if (inputType.startsWith('delete'))
      normalizeEmptiedEditor(editor, deletion?.selectedAll);
    const restore =
      deletion &&
      (deletion.selectedAll ||
        editor.querySelectorAll(TOKEN_SELECTOR).length < deletion.tokenCount);
    // Own the replacement before application listeners synchronously render.
    // A populated field can be visually open while its adopted signal is false.
    if (restore) {
      restoreDeletion(editor, deletion);
      if (
        manageFocus &&
        editor.closest<HTMLElement>('[data-component="token-search-field"]')
          ?.dataset.collapsible === 'true'
      )
        setExpanded(editorId, true);
    }
    if (onEdit) {
      const field = editor.closest<HTMLElement>(
        '[data-component="token-search-field"]',
      );
      const id = field?.dataset.tokenSearchId;
      if (id && field?.dataset.disabled !== 'true')
        onEdit({ id, editor, event: event as InputEvent });
    }
    pending.delete(editorId);
  };
  root.addEventListener('beforeinput', onBeforeInput, true);
  root.addEventListener('input', onInput, true);

  const clearSelectAllIntent = (event: Event) => {
    const editor = editorFromEvent(root, event);
    if (editor) selectAllIntents.delete(editor);
  };
  const trackSelectAllIntent = (event: Event) => {
    const keyboardEvent = event as KeyboardEvent;
    const editor = editorFromEvent(root, event);
    if (!editor || keyboardEvent.isComposing) return;
    const fullDeletionInputType =
      keyboardEvent.key === 'Backspace'
        ? 'deleteContentBackward'
        : keyboardEvent.key === 'Delete'
          ? 'deleteContentForward'
          : undefined;
    if (
      keyboardEvent.key.toLowerCase() === 'a' &&
      (keyboardEvent.ctrlKey || keyboardEvent.metaKey) &&
      !keyboardEvent.altKey &&
      !keyboardEvent.shiftKey
    ) {
      // Capture this before target/bubble handlers can stop propagation.
      selectAllIntents.add(editor);
      return;
    }
    if (fullDeletionInputType && selectAllIntents.delete(editor)) {
      if (editor.parentElement?.dataset.disabled === 'true') return;
      // Native mixed-contenteditable deletion is not reliable: Linux engines
      // can leave contenteditable=false chips behind, and a controlled render
      // then restores them from application state. The preceding shortcut is
      // an unambiguous full-delete request, so own that transition and publish
      // the same bubbling input contract the native edit would have produced.
      keyboardEvent.preventDefault();
      captureDeletion(editor, true);
      normalizeEmptiedEditor(editor, true);
      editor.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          inputType: fullDeletionInputType,
        }),
      );
      return;
    }
    // Any intervening keyboard action consumes the shortcut intent. Printable
    // replacement typing clears it here before the browser's input event; the
    // input listener also covers paste, drop, and other non-keyboard edits.
    if (!fullDeletionInputType) selectAllIntents.delete(editor);
  };
  root.addEventListener('keydown', trackSelectAllIntent, true);
  root.addEventListener('pointerdown', clearSelectAllIntent, true);
  root.addEventListener('focusout', clearSelectAllIntent, true);

  const disposers: Array<() => void> = [
    () => {
      pending.clear();
      for (const stop of deleting.values()) stop();
    },
    () => root.removeEventListener('beforeinput', onBeforeInput, true),
    () => root.removeEventListener('input', onInput, true),
    () => root.removeEventListener('keydown', trackSelectAllIntent, true),
    () => root.removeEventListener('pointerdown', clearSelectAllIntent, true),
    () => root.removeEventListener('focusout', clearSelectAllIntent, true),
  ];

  disposers.push(
    delegate(
      root,
      'keydown',
      '[data-token-search-editor]',
      (event, element) => {
        const keyboardEvent = event as KeyboardEvent;
        const editor = element as HTMLElement;
        if (keyboardEvent.isComposing) return;
        const field = editor.closest<HTMLElement>(
          '[data-component="token-search-field"]',
        );
        const id = field?.dataset.tokenSearchId;
        if (!id || field?.dataset.disabled === 'true') return;
        if (keyboardEvent.key === 'Enter') {
          keyboardEvent.preventDefault();
          onSubmit?.({ id, editor });
          return;
        }
        if (
          removeAdjacentToken &&
          (keyboardEvent.key === 'Backspace' || keyboardEvent.key === 'Delete')
        ) {
          const direction =
            keyboardEvent.key === 'Backspace' ? 'backward' : 'forward';
          const chip = adjacentToken(editor, direction);
          if (chip) {
            keyboardEvent.preventDefault();
            onRemoveToken?.({
              id,
              value: chip.dataset.tokenValue ?? '',
              editor,
              direction,
            });
            return;
          }
        }
        if (moveCaretPastToken && keyboardEvent.key === 'ArrowRight') {
          const chip = adjacentToken(editor, 'forward');
          if (chip) {
            keyboardEvent.preventDefault();
            placeCaretAfterToken(editor, chip);
            return;
          }
        }
        if (
          collapseOnEscape &&
          keyboardEvent.key === 'Escape' &&
          field?.dataset.collapsible === 'true' &&
          editorIsEmpty(editor)
        ) {
          keyboardEvent.preventDefault();
          closeField(id);
        }
      },
    ),
  );

  if (expandOnActivate) {
    disposers.push(
      delegate(
        root,
        'click',
        '.kui-token-search__expand',
        (_event, element) => {
          // The selector guarantees a collapsible field ancestor; only skip a disabled one.
          const field = (element as HTMLElement).closest<HTMLElement>(
            '[data-component="token-search-field"]',
          );
          const id = field?.dataset.tokenSearchId;
          if (id && field?.dataset.disabled !== 'true') openField(id);
        },
      ),
    );
  }

  if (manageFocus) {
    disposers.push(
      () => clearing.clear(),
      delegateCapture(
        root,
        'click',
        '.kui-token-search__clear',
        (_event, element) => {
          const field = element.closest<HTMLElement>(
            '[data-component="token-search-field"]',
          );
          const id = field?.dataset.tokenSearchId;
          if (
            !id ||
            field.dataset.collapsible !== 'true' ||
            field.dataset.disabled === 'true'
          )
            return;
          const editor = replacementEditor(root, id);
          // Capture before the application's clear handler empties and replaces the
          // editor. A replacement blur must not collapse the adopted open signal.
          clearing.add(id);
          setExpanded(id, true);
          view().requestAnimationFrame(() => {
            if (!clearing.delete(id)) return;
            const replacement = replacementEditor(root, id);
            const active = root.ownerDocument.activeElement;
            if (
              !replacement ||
              (active !== editor &&
                active !== element &&
                active !== replacement &&
                active !== root.ownerDocument.body)
            )
              return;
            placeTokenSearchCaret(replacement);
          });
        },
      ),
    );
  }

  if (collapseOnEmptyBlur) {
    // Pressing an in-field control (clear, trailing, token, or the trigger) must not
    // blur the editor — otherwise the transient blur would collapse the field before
    // the control's own handler runs. Keeping focus also keeps the click firing.
    disposers.push(
      delegate(
        root,
        'mousedown',
        '[data-component="token-search-field"][data-collapsible="true"] button',
        (event) => {
          event.preventDefault();
        },
      ),
    );
    disposers.push(
      delegate(
        root,
        'focusout',
        '[data-token-search-editor]',
        (event, element) => {
          const editor = element as HTMLElement;
          const field = editor.closest<HTMLElement>(
            '[data-component="token-search-field"]',
          );
          const id = field?.dataset.tokenSearchId;
          if (
            !id ||
            field?.dataset.collapsible !== 'true' ||
            field.dataset.disabled === 'true'
          )
            return;
          const next = (event as FocusEvent).relatedTarget;
          if (!next && (clearing.has(id) || (manageFocus && deleting.has(id))))
            return;
          if (next instanceof Node && field.contains(next)) return;
          if (isExemptTarget(next instanceof Element ? next : null)) return;
          if (!editorIsEmpty(editor)) return;
          view().queueMicrotask(() => {
            const active = field.ownerDocument.activeElement;
            if (!field.contains(active) && !isExemptTarget(active))
              setExpanded(id, false);
          });
        },
      ),
    );
  }

  const dispose = () => {
    disposed = true;
    for (const stop of disposers.splice(0)) stop();
  };
  const handle = (() => dispose()) as TokenSearchFieldsHandle;
  handle.dispose = dispose;
  handle.expanded = (id) => (managed ? signalFor(id) : undefined);
  handle.open = (id) => {
    if (managed && !disposed) openField(id);
  };
  handle.close = (id) => {
    if (managed && !disposed) closeField(id);
  };
  return handle;
}
