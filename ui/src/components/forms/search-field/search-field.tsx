import type { SafeHtml } from 'kerfjs';
import { Search, X } from 'lucide';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import { LucideIcon } from '../../media/lucide-icon/lucide-icon.js';
import type { SearchFieldModel } from './model/search-field-model.js';

export interface SearchFieldToken {
  value: string;
  label: string;
  offset?: number;
  accessibleLabel?: string;
}

/**
 * Domain `data-*` metadata for a trailing action button. The component owns
 * `data-action` (pass `action`) and its state attributes.
 */
export type SearchFieldTrailingActionAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-action'?: never;
    'data-component'?: never;
    'data-key'?: never;
  }
>;

interface SearchFieldTrailingActionBase {
  /** Decorative glyph, such as a `LucideIcon`. */
  icon: SafeHtml;
  /** Accessible name and tooltip, in title style ("Search Help"). */
  label: string;
  /** Delegated `data-action` value. */
  action: string;
  id?: string;
  /** `aria-controls`: the id of the surface this button opens or toggles. */
  controls?: string;
  /** `aria-haspopup` for a button that opens a dialog, menu, or listbox. */
  haspopup?: 'dialog' | 'menu' | 'listbox' | 'true';
  /** Domain `data-*` metadata for the app's delegated handler. */
  attributes?: SearchFieldTrailingActionAttributes;
}

/**
 * A compact icon button in the field's trailing slot, sized and styled like
 * the clear button. Pass `expanded` for a disclosure (a help surface it opens)
 * or `pressed` for a toggle; the button shows the state with its hover fill.
 */
export type SearchFieldTrailingAction = SearchFieldTrailingActionBase &
  (
    | { expanded?: boolean; pressed?: never }
    | { expanded?: never; pressed?: boolean }
  );

export type SearchFieldEditorAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-component'?: never;
    'data-key'?: never;
    'data-morph-skip'?: never;
    'data-search-field-editor'?: never;
    'data-token-count'?: never;
    'data-placeholder'?: never;
  }
>;

interface SearchFieldBaseProps {
  id: string;
  label: string;
  query?: string;
  tokens?: readonly SearchFieldToken[];
  /** Opt-in grammar, suggestion, and evaluation state. Overrides `query` and `tokens`. */
  model?: SearchFieldModel;
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
  editorAttributes?: SearchFieldEditorAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

type SearchFieldTrailingProps =
  | { trailing?: KerfUiContent; trailingAction?: never }
  | { trailing?: never; trailingAction: SearchFieldTrailingAction };

type SearchFieldPresentationProps =
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

type SearchFieldCollapsibleProps =
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

export type SearchFieldProps = SearchFieldBaseProps &
  SearchFieldCollapsibleProps &
  SearchFieldTrailingProps &
  SearchFieldPresentationProps;

export interface SearchFieldValue {
  query: string;
  tokens: SearchFieldToken[];
}

type SearchFieldPart =
  { kind: 'text'; value: string } | { kind: 'token'; token: SearchFieldToken };

function orderedParts(
  query: string,
  tokens: readonly SearchFieldToken[],
): SearchFieldPart[] {
  const ordered = tokens
    .map((token, index) => ({
      token,
      index,
      offset: Math.max(0, Math.min(query.length, token.offset ?? query.length)),
    }))
    .sort(
      (left, right) => left.offset - right.offset || left.index - right.index,
    );
  const parts: SearchFieldPart[] = [];
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

// Markers the component writes; data-key is not one of them on the root
// (only inner rows use it), so an app row key passes through.
const SEARCH_FIELD_PROTECTED = new Set([
  'data-action',
  'data-collapsible',
  'data-component',
  'data-disabled',
  'data-empty',
  'data-expanded',
  'data-fill',
  'data-has-trailing',
  'data-placeholder',
  'data-placeholder-visible',
  'data-presentation',
  'data-search-field-editor',
  'data-search-field-form-field',
  'data-search-field-form-label',
  'data-search-field-id',
  'data-search-field-suggestion',
  'data-token-count',
  'data-token-value',
]);

export function SearchField({
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
  expandAction = 'expand-search-field',
  expandLabel,
  leading,
  trailing,
  trailingAction,
  presentation = 'standalone',
  hint,
  required = false,
  editAction = 'edit-search-token',
  removeAction = 'remove-search-token',
  clearAction = 'clear-search-field',
  clearLabel = 'Clear Search',
  clearIcon,
  className = '',
  editorAttributes = {},
  slot,
  rootAttributes = {},
}: SearchFieldProps) {
  // A managed model subscribes the host render to `structure` (token,
  // emptiness, and revision changes) only. The live text is DOM-owned between
  // structural changes, so it is peeked, not read: typing must not re-run the
  // host render on every keystroke.
  const structure = model?.structure.value;
  if (model) ({ query, tokens } = model.state.peek());
  const suggestions = model?.suggestions.value ?? [];
  const parts = orderedParts(query, tokens);
  const tokenKey = tokens.map((token) => token.value).join('|');
  const key = structure
    ? `${id}@${String(revision ?? '')}:${structure.editorRevision}:${tokenKey}`
    : revision === undefined
      ? `${id}:${tokenKey}`
      : `${id}@${String(revision)}:${tokenKey}`;
  const resolvedExpanded =
    !collapsible || expanded || query.length > 0 || tokens.length > 0;
  const control = (
    <div
      {...(presentation === 'form-field'
        ? {}
        : filterDataAttributes(rootAttributes, SEARCH_FIELD_PROTECTED))}
      class={`kui-search-field ${presentation === 'form-field' ? '' : className}`.trim()}
      data-component="search-field"
      data-search-field-id={id}
      data-disabled={String(disabled)}
      data-collapsible={String(collapsible)}
      data-expanded={String(resolvedExpanded)}
      data-fill={String(fill)}
      data-has-trailing={String(Boolean(trailing || trailingAction))}
      data-presentation={presentation}
      data-placeholder={tokens.length ? tokenPlaceholder : placeholder}
      data-placeholder-visible={String(
        query.length === 0 && tokens.length === 0,
      )}
      slot={slot}
    >
      {!resolvedExpanded ? (
        <button
          type="button"
          class="kui-search-field__expand"
          data-action={expandAction}
          aria-label={expandLabel ?? label}
          title={expandLabel ?? label}
          disabled={disabled}
        >
          <LucideIcon icon={Search} name="search" />
        </button>
      ) : (
        <>
          <span class="kui-search-field__leading" aria-hidden="true">
            {leading ?? <LucideIcon icon={Search} name="search" />}
          </span>
          <div
            {...editorAttributes}
            class="kui-search-field__editor"
            data-key={key}
            data-morph-skip
            data-search-field-editor={id}
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
                  data-search-field-text
                  data-empty={String(part.value.length === 0)}
                >
                  {part.value || (tokens.length ? '\u200b' : '')}
                </span>
              ) : (
                <span
                  class="kui-search-field__token"
                  contenteditable="false"
                  data-component="search-field-token"
                  data-token-value={part.token.value}
                >
                  <button
                    type="button"
                    class="kui-search-field__token-edit"
                    data-action={editAction}
                    data-token-value={part.token.value}
                    aria-label={`Edit ${part.token.accessibleLabel ?? part.token.label}`}
                    disabled={disabled}
                  >
                    {part.token.label}
                  </button>
                  <button
                    type="button"
                    class="kui-search-field__token-remove"
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
              class="kui-search-field__clear"
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
              {...trailingAction.attributes}
              type="button"
              class="kui-search-field__trailing-action"
              id={trailingAction.id}
              data-action={trailingAction.action}
              aria-label={trailingAction.label}
              aria-expanded={
                trailingAction.expanded === undefined
                  ? undefined
                  : String(trailingAction.expanded)
              }
              aria-pressed={
                trailingAction.pressed === undefined
                  ? undefined
                  : String(trailingAction.pressed)
              }
              aria-controls={trailingAction.controls}
              aria-haspopup={trailingAction.haspopup}
              title={trailingAction.label}
              disabled={disabled}
            >
              {trailingAction.icon}
            </button>
          ) : trailing ? (
            <span class="kui-search-field__trailing">{trailing}</span>
          ) : null}
          {!disabled && suggestions.length > 0 && (
            <div
              class="kui-search-field__suggestions"
              data-search-field-keep-open
            >
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  class="kui-search-field__suggestion"
                  data-search-field-suggestion={suggestion.value}
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
    <div
      {...filterDataAttributes(rootAttributes, SEARCH_FIELD_PROTECTED)}
      class={`kui-search-field__field ${className}`.trim()}
      data-search-field-form-field={id}
    >
      <div
        class="kui-search-field__field-label"
        id={`${id}-label`}
        data-search-field-form-label={id}
      >
        {label}
        {required && (
          <span class="kui-search-field__field-required" aria-hidden="true">
            *
          </span>
        )}
      </div>
      {control}
      {hint && (
        <div class="kui-search-field__field-hint" id={`${id}-hint`}>
          {hint}
        </div>
      )}
    </div>
  );
}

/** Read editable text and ordered token offsets from a rendered SearchField editor. */
export function readSearchField(
  editor: HTMLElement,
  knownTokens: readonly SearchFieldToken[] = [],
): SearchFieldValue {
  let query = '';
  const tokens: SearchFieldToken[] = [];
  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      query += (node.textContent ?? '')
        .replaceAll('\u00a0', ' ')
        .replaceAll('\u200b', '');
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.matches('[data-component="search-field-token"]')) {
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
export function placeSearchFieldCaret(
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
        node.parentElement?.closest('[data-component="search-field-token"]')
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
