import type { SafeHtml } from 'kerfjs';
import { Search, X } from 'lucide';

import { LucideIcon } from './lucide-icon.js';

export interface TokenSearchToken {
  value: string;
  label: string;
  offset?: number;
  accessibleLabel?: string;
}

export interface TokenSearchFieldProps {
  id: string;
  label: string;
  query?: string;
  tokens?: readonly TokenSearchToken[];
  placeholder?: string;
  tokenPlaceholder?: string;
  disabled?: boolean;
  autofocus?: boolean;
  leading?: SafeHtml;
  trailing?: SafeHtml;
  editAction?: string;
  removeAction?: string;
  clearAction?: string;
  clearLabel?: string;
  className?: string;
  editorAttributes?: Readonly<Record<`data-${string}`, string>>;
}

export interface TokenSearchFieldValue {
  query: string;
  tokens: TokenSearchToken[];
}

type TokenSearchPart =
  | { kind: 'text'; value: string }
  | { kind: 'token'; token: TokenSearchToken };

function orderedParts(query: string, tokens: readonly TokenSearchToken[]): TokenSearchPart[] {
  const ordered = tokens
    .map((token, index) => ({ token, index, offset: Math.max(0, Math.min(query.length, token.offset ?? query.length)) }))
    .sort((left, right) => left.offset - right.offset || left.index - right.index);
  const parts: TokenSearchPart[] = [];
  let cursor = 0;
  for (const { token, offset } of ordered) {
    parts.push({ kind: 'text', value: query.slice(cursor, offset) });
    parts.push({ kind: 'token', token: { ...token, offset } });
    cursor = offset;
  }
  parts.push({ kind: 'text', value: query.slice(cursor) });
  return parts;
}

function CloseIcon() {
  return <LucideIcon icon={X} name="x" />;
}

export function TokenSearchField({
  id,
  label,
  query = '',
  tokens = [],
  placeholder = 'Search',
  tokenPlaceholder = 'Add search…',
  disabled = false,
  autofocus = false,
  leading,
  trailing,
  editAction = 'edit-search-token',
  removeAction = 'remove-search-token',
  clearAction = 'clear-token-search',
  clearLabel = 'Clear search',
  className = '',
  editorAttributes = {},
}: TokenSearchFieldProps) {
  const parts = orderedParts(query, tokens);
  const key = `${id}:${tokens.map((token) => token.value).join('|')}`;
  return <div class={`kui-token-search ${className}`.trim()} data-component="token-search-field" data-token-search-id={id} data-disabled={String(disabled)}>
    <span class="kui-token-search__leading" aria-hidden="true">{leading ?? <LucideIcon icon={Search} name="search" />}</span>
    <div
      {...editorAttributes}
      class="kui-token-search__editor"
      data-key={key}
      data-morph-skip
      data-token-search-editor={id}
      data-token-count={tokens.length}
      data-placeholder={tokens.length ? tokenPlaceholder : placeholder}
      role="searchbox"
      aria-label={label}
      aria-disabled={disabled ? 'true' : undefined}
      contenteditable={disabled ? 'false' : 'true'}
      spellcheck="false"
      autofocus={autofocus}
    >{parts.map((part) => part.kind === 'text'
      ? <span data-token-search-text data-empty={String(part.value.length === 0)}>{part.value || (tokens.length ? '\u200b' : '')}</span>
      : <span class="kui-token-search__token" contenteditable="false" data-component="token-search-token" data-token-value={part.token.value}>
        <button type="button" class="kui-token-search__token-edit" data-action={editAction} data-token-value={part.token.value} aria-label={`Edit ${part.token.accessibleLabel ?? part.token.label}`} disabled={disabled}>{part.token.label}</button>
        <button type="button" class="kui-token-search__token-remove" data-action={removeAction} data-token-value={part.token.value} aria-label={`Remove ${part.token.accessibleLabel ?? part.token.label}`} disabled={disabled}><CloseIcon /></button>
      </span>)}</div>
    {(query || tokens.length > 0) && <button type="button" class="kui-token-search__clear" data-action={clearAction} aria-label={clearLabel} title={clearLabel} disabled={disabled}><CloseIcon /></button>}
    {trailing && <span class="kui-token-search__trailing">{trailing}</span>}
  </div>;
}

/** Read editable text and ordered token offsets from a rendered TokenSearchField editor. */
export function readTokenSearchField(editor: HTMLElement, knownTokens: readonly TokenSearchToken[] = []): TokenSearchFieldValue {
  let query = '';
  const tokens: TokenSearchToken[] = [];
  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      query += (node.textContent ?? '').replaceAll('\u00a0', ' ').replaceAll('\u200b', '');
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.matches('[data-component="token-search-token"]')) {
      const value = node.dataset.tokenValue;
      const known = knownTokens.find((token) => token.value === value);
      if (known) tokens.push({ ...known, offset: query.length });
      else if (value) tokens.push({ value, label: value, offset: query.length });
      return;
    }
    if (node.tagName === 'BR') {
      query += ' ';
      return;
    }
    for (const child of node.childNodes) visit(child);
  };
  for (const child of editor.childNodes) visit(child);
  return { query, tokens };
}

/** Focus an editor and place its caret at a text offset, skipping atomic token chips. */
export function placeTokenSearchCaret(editor: HTMLElement, offset?: number): void {
  editor.focus({ preventScroll: true });
  const selection = globalThis.getSelection();
  if (!selection) return;
  const range = document.createRange();
  if (offset === undefined) {
    range.selectNodeContents(editor);
    range.collapse(false);
  } else {
    let remaining = Math.max(0, offset);
    let found = false;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => node.parentElement?.closest('[data-component="token-search-token"]')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const source = node.textContent ?? '';
      const length = source.replaceAll('\u200b', '').length;
      if (remaining <= length) {
        range.setStart(node, source === '\u200b' ? 0 : Math.min(remaining, source.length));
        range.collapse(true);
        found = true;
        break;
      }
      remaining -= length;
    }
    if (!found) {
      range.selectNodeContents(editor);
      range.collapse(false);
    }
  }
  selection.removeAllRanges();
  selection.addRange(range);
}
