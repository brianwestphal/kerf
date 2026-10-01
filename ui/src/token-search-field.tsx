import type { SafeHtml } from 'kerfjs';
import { Search, X } from 'lucide';

import { LucideIcon } from './lucide-icon.js';
import type { KerfUiContent } from './semantic-content.js';
import type { TokenSearchModel } from './token-search-model.js';

export interface TokenSearchToken {
  value: string;
  label: string;
  offset?: number;
  accessibleLabel?: string;
}

export interface TokenSearchTrailingAction {
  icon: SafeHtml;
  label: string;
  action: string;
  id?: string;
}

export type TokenSearchEditorAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-key'?: never;
    'data-morph-skip'?: never;
    'data-token-search-editor'?: never;
    'data-token-count'?: never;
    'data-placeholder'?: never;
  }
>;

interface TokenSearchFieldBaseProps {
  id: string;
  label: string;
  query?: string;
  tokens?: readonly TokenSearchToken[];
  /** Opt-in grammar, suggestion, and evaluation state. Overrides `query` and `tokens`. */
  model?: TokenSearchModel;
  /**
   * Editor identity for a programmatic text replacement. The editor's text is
   * DOM-owned between token changes, so a new `query` with the same tokens
   * does not re-render it (that would reset the caret on every keystroke).
   * Change `revision` when the app replaces the text itself — reseeding a
   * persistent dialog's field on reopen, applying a saved search — and the
   * editor is rebuilt from `query` and `tokens`.
   */
  revision?: string | number;
  placeholder?: string;
  tokenPlaceholder?: string;
  disabled?: boolean;
  autofocus?: boolean;
  /** Let an expanded collapsible field consume the available inline width. */
  fill?: boolean;
  leading?: KerfUiContent;
  editAction?: string;
  removeAction?: string;
  clearAction?: string;
  clearLabel?: string;
  /** Icon for the clear button. Default: the Lucide `x` glyph token chips also use. */
  clearIcon?: SafeHtml;
  className?: string;
  editorAttributes?: TokenSearchEditorAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

type TokenSearchTrailingProps =
  | { trailing?: KerfUiContent; trailingAction?: never }
  | { trailing?: never; trailingAction: TokenSearchTrailingAction };

type TokenSearchPresentationProps =
  | {
      /** Standalone field chrome or the inset visual layer of a configured toolbar group. */
      presentation?: 'standalone' | 'toolbar-group';
      hint?: never;
      required?: never;
    }
  | {
      /** Visible form label and optional hint around the full-width standalone control. */
      presentation: 'form-field';
      hint?: string;
      /** Marks the editor required; the app validates its value. */
      required?: boolean;
    };

type TokenSearchCollapsibleProps =
  | {
      /** Allow an empty field to render as one iconic action. */
      collapsible: true;
      /** Keep an empty collapsible field open while the application owns focus. */
      expanded?: boolean;
      expandAction?: string;
      expandLabel?: string;
    }
  | {
      collapsible?: false;
      expanded?: never;
      expandAction?: never;
      expandLabel?: never;
    };

export type TokenSearchFieldProps = TokenSearchFieldBaseProps &
  TokenSearchCollapsibleProps &
  TokenSearchTrailingProps &
  TokenSearchPresentationProps;

export interface TokenSearchFieldValue {
  query: string;
  tokens: TokenSearchToken[];
}

type TokenSearchPart =
  { kind: 'text'; value: string } | { kind: 'token'; token: TokenSearchToken };

function orderedParts(
  query: string,
  tokens: readonly TokenSearchToken[],
): TokenSearchPart[] {
  const ordered = tokens
    .map((token, index) => ({
      token,
      index,
      offset: Math.max(0, Math.min(query.length, token.offset ?? query.length)),
    }))
    .sort(
      (left, right) => left.offset - right.offset || left.index - right.index,
    );
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
  model,
  revision,
  placeholder = 'Search',
  tokenPlaceholder = 'Add search…',
  disabled = false,
  autofocus = false,
  fill = false,
  collapsible = false,
  expanded = false,
  expandAction = 'expand-token-search',
  expandLabel,
  leading,
  trailing,
  trailingAction,
  presentation = 'standalone',
  hint,
  required = false,
  editAction = 'edit-search-token',
  removeAction = 'remove-search-token',
  clearAction = 'clear-token-search',
  clearLabel = 'Clear search',
  clearIcon,
  className = '',
  editorAttributes = {},
  slot,
}: TokenSearchFieldProps) {
  if (model) {
    query = model.state.value.query;
    tokens = model.state.value.tokens;
  }
  const suggestions = model?.suggestions.value ?? [];
  const parts = orderedParts(query, tokens);
  const tokenKey = tokens.map((token) => token.value).join('|');
  const key = model
    ? `${id}@${String(revision ?? '')}:${model.editorRevision.value}:${tokenKey}`
    : revision === undefined
      ? `${id}:${tokenKey}`
      : `${id}@${String(revision)}:${tokenKey}`;
  const resolvedExpanded =
    !collapsible || expanded || query.length > 0 || tokens.length > 0;
  const control = (
    <div
      class={`kui-token-search ${className}`.trim()}
      data-component="token-search-field"
      data-token-search-id={id}
      data-disabled={String(disabled)}
      data-collapsible={String(collapsible)}
      data-expanded={String(resolvedExpanded)}
      data-fill={String(fill)}
      data-has-trailing={String(Boolean(trailing || trailingAction))}
      data-presentation={presentation}
      slot={slot}
    >
      {!resolvedExpanded ? (
        <button
          type="button"
          class="kui-token-search__expand"
          data-action={expandAction}
          aria-label={expandLabel ?? label}
          title={expandLabel ?? label}
          disabled={disabled}
        >
          <LucideIcon icon={Search} name="search" />
        </button>
      ) : (
        <>
          <span class="kui-token-search__leading" aria-hidden="true">
            {leading ?? <LucideIcon icon={Search} name="search" />}
          </span>
          <div
            {...editorAttributes}
            class="kui-token-search__editor"
            data-key={key}
            data-morph-skip
            data-token-search-editor={id}
            data-token-count={tokens.length}
            data-placeholder={tokens.length ? tokenPlaceholder : placeholder}
            role="searchbox"
            aria-label={presentation === 'form-field' ? undefined : label}
            aria-labelledby={
              presentation === 'form-field' ? `${id}-label` : undefined
            }
            aria-describedby={
              presentation === 'form-field' && hint ? `${id}-hint` : undefined
            }
            aria-required={required ? 'true' : undefined}
            aria-disabled={disabled ? 'true' : undefined}
            contenteditable={disabled ? 'false' : 'true'}
            spellcheck="false"
            autofocus={autofocus}
          >
            {parts.map((part) =>
              part.kind === 'text' ? (
                <span
                  data-token-search-text
                  data-empty={String(part.value.length === 0)}
                >
                  {part.value || (tokens.length ? '\u200b' : '')}
                </span>
              ) : (
                <span
                  class="kui-token-search__token"
                  contenteditable="false"
                  data-component="token-search-token"
                  data-token-value={part.token.value}
                >
                  <button
                    type="button"
                    class="kui-token-search__token-edit"
                    data-action={editAction}
                    data-token-value={part.token.value}
                    aria-label={`Edit ${part.token.accessibleLabel ?? part.token.label}`}
                    disabled={disabled}
                  >
                    {part.token.label}
                  </button>
                  <button
                    type="button"
                    class="kui-token-search__token-remove"
                    data-action={removeAction}
                    data-token-value={part.token.value}
                    aria-label={`Remove ${part.token.accessibleLabel ?? part.token.label}`}
                    disabled={disabled}
                  >
                    <CloseIcon />
                  </button>
                </span>
              ),
            )}
          </div>
          {(query || tokens.length > 0) && (
            <button
              type="button"
              class="kui-token-search__clear"
              data-action={clearAction}
              aria-label={clearLabel}
              title={clearLabel}
              disabled={disabled}
            >
              {clearIcon ?? <CloseIcon />}
            </button>
          )}
          {trailingAction ? (
            <button
              type="button"
              class="kui-token-search__trailing-action"
              id={trailingAction.id}
              data-action={trailingAction.action}
              aria-label={trailingAction.label}
              title={trailingAction.label}
              disabled={disabled}
            >
              {trailingAction.icon}
            </button>
          ) : trailing ? (
            <span class="kui-token-search__trailing">{trailing}</span>
          ) : null}
          {!disabled && suggestions.length > 0 && (
            <div
              class="kui-token-search__suggestions"
              data-token-search-keep-open
            >
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  class="kui-token-search__suggestion"
                  data-token-search-suggestion={suggestion.value}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
  if (presentation !== 'form-field') return control;
  return (
    <div class="kui-token-search__field" data-token-search-form-field={id}>
      <div
        class="kui-token-search__field-label"
        id={`${id}-label`}
        data-token-search-form-label={id}
      >
        {label}
        {required && (
          <span class="kui-token-search__field-required" aria-hidden="true">
            *
          </span>
        )}
      </div>
      {control}
      {hint && (
        <div class="kui-token-search__field-hint" id={`${id}-hint`}>
          {hint}
        </div>
      )}
    </div>
  );
}

/** Read editable text and ordered token offsets from a rendered TokenSearchField editor. */
export function readTokenSearchField(
  editor: HTMLElement,
  knownTokens: readonly TokenSearchToken[] = [],
): TokenSearchFieldValue {
  let query = '';
  const tokens: TokenSearchToken[] = [];
  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      query += (node.textContent ?? '')
        .replaceAll('\u00a0', ' ')
        .replaceAll('\u200b', '');
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.matches('[data-component="token-search-token"]')) {
      const value = node.dataset.tokenValue;
      const known = knownTokens.find((token) => token.value === value);
      if (known) tokens.push({ ...known, offset: query.length });
      else if (value)
        tokens.push({ value, label: value, offset: query.length });
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
export function placeTokenSearchCaret(
  editor: HTMLElement,
  offset?: number,
): void {
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
      acceptNode: (node) =>
        node.parentElement?.closest('[data-component="token-search-token"]')
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const source = node.textContent ?? '';
      const length = source.replaceAll('\u200b', '').length;
      if (remaining <= length) {
        range.setStart(
          node,
          source === '\u200b' ? 0 : Math.min(remaining, source.length),
        );
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
