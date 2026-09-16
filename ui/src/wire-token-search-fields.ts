import { delegate, type Signal,signal } from 'kerfjs';

import { placeTokenSearchCaret, readTokenSearchField } from './token-search-field.js';

export interface TokenSearchSubmit {
  id: string;
  editor: HTMLElement;
}

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
  /** Focus the editor on expand and the trigger on Escape-collapse. Default: true. */
  manageFocus?: boolean;
  /** App-owned `expanded` signals keyed by field id; adopted instead of helper-created. */
  signals?: Readonly<Record<string, Signal<boolean>>>;
}

export interface WireTokenSearchFieldsOptions {
  onSubmit?: (submission: TokenSearchSubmit) => void;
  /** Managed collapsible transient behavior. `true`/omitted = on with defaults; `false` = fully off. */
  collapsible?: boolean | TokenSearchCollapsibleOptions;
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

function editorIsEmpty(editor: HTMLElement): boolean {
  const value = readTokenSearchField(editor);
  return value.query.length === 0 && value.tokens.length === 0;
}

/**
 * Wire every TokenSearchField under `root`: submit on Enter, preserve the caret across
 * controlled token deletion, and (by default) manage the collapsible field's transient
 * expand/collapse/focus. Returns a {@link TokenSearchFieldsHandle} — a disposer that also
 * exposes the managed `expanded` state per field id.
 */
export function wireTokenSearchFields(
  root: HTMLElement,
  { onSubmit, collapsible = true }: WireTokenSearchFieldsOptions = {},
): TokenSearchFieldsHandle {
  const managed = collapsible !== false;
  const config = typeof collapsible === 'object' ? collapsible : {};
  const expandOnActivate = managed && (config.expandOnActivate ?? true);
  const collapseOnEmptyBlur = managed && (config.collapseOnEmptyBlur ?? true);
  const collapseOnEscape = managed && (config.collapseOnEscape ?? true);
  const manageFocus = managed && (config.manageFocus ?? true);
  const adopted = config.signals ?? {};
  const created = new Map<string, Signal<boolean>>();

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
      const target = root.querySelector<HTMLElement>(
        `[data-component="token-search-field"][data-token-search-id="${CSS.escape(id)}"] ${selector}`,
      );
      if (!target) return;
      if (target.matches('[data-token-search-editor]')) placeTokenSearchCaret(target);
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

  const disposers: Array<() => void> = [
    () => root.removeEventListener('beforeinput', onBeforeInput, true),
    () => root.removeEventListener('input', onInput, true),
  ];

  disposers.push(
    delegate(root, 'keydown', '[data-token-search-editor]', (event, element) => {
      const keyboardEvent = event as KeyboardEvent;
      const editor = element as HTMLElement;
      if (keyboardEvent.isComposing) return;
      const field = editor.closest<HTMLElement>('[data-component="token-search-field"]');
      const id = field?.dataset.tokenSearchId;
      if (!id || field?.dataset.disabled === 'true') return;
      if (keyboardEvent.key === 'Enter') {
        keyboardEvent.preventDefault();
        onSubmit?.({ id, editor });
        return;
      }
      if (collapseOnEscape && keyboardEvent.key === 'Escape' && field?.dataset.collapsible === 'true' && editorIsEmpty(editor)) {
        keyboardEvent.preventDefault();
        closeField(id);
      }
    }),
  );

  if (expandOnActivate) {
    disposers.push(
      delegate(root, 'click', '.kui-token-search__expand', (_event, element) => {
        // The selector guarantees a collapsible field ancestor; only skip a disabled one.
        const field = (element as HTMLElement).closest<HTMLElement>('[data-component="token-search-field"]');
        const id = field?.dataset.tokenSearchId;
        if (id && field?.dataset.disabled !== 'true') openField(id);
      }),
    );
  }

  if (collapseOnEmptyBlur) {
    // Pressing an in-field control (clear, trailing, token, or the trigger) must not
    // blur the editor — otherwise the transient blur would collapse the field before
    // the control's own handler runs. Keeping focus also keeps the click firing.
    disposers.push(
      delegate(root, 'mousedown', '[data-component="token-search-field"][data-collapsible="true"] button', (event) => {
        event.preventDefault();
      }),
    );
    disposers.push(
      delegate(root, 'focusout', '[data-token-search-editor]', (event, element) => {
        const editor = element as HTMLElement;
        const field = editor.closest<HTMLElement>('[data-component="token-search-field"]');
        const id = field?.dataset.tokenSearchId;
        if (!id || field?.dataset.collapsible !== 'true' || field.dataset.disabled === 'true') return;
        const next = (event as FocusEvent).relatedTarget;
        if (next instanceof Node && field.contains(next)) return;
        if (!editorIsEmpty(editor)) return;
        view().queueMicrotask(() => {
          if (!field.contains(field.ownerDocument.activeElement)) setExpanded(id, false);
        });
      }),
    );
  }

  const dispose = () => {
    for (const stop of disposers.splice(0)) stop();
  };
  const handle = (() => dispose()) as TokenSearchFieldsHandle;
  handle.dispose = dispose;
  handle.expanded = (id) => (managed ? signalFor(id) : undefined);
  handle.open = (id) => {
    if (managed) openField(id);
  };
  handle.close = (id) => {
    if (managed) closeField(id);
  };
  return handle;
}
