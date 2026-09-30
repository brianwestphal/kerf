import { type Signal, signal } from 'kerfjs';

import type {
  TokenSearchFieldValue,
  TokenSearchToken,
} from './token-search-field.js';

export interface TokenSearchRule {
  /** The word before `:` (for example `tag` or `status`). */
  name: string;
  /** Return a canonical value, or undefined to leave invalid input as text. */
  parse?: (input: string) => string | undefined;
  /** Label for a committed chip. Defaults to `name:input`. */
  label?: (value: string, input: string) => string;
  /** Suggestions for the unfinished value after `name:`, with current committed tokens. */
  suggest?: (
    input: string,
    state: TokenSearchState,
  ) => readonly (string | { value: string; label: string })[];
}

export interface TokenSearchResolvedToken extends TokenSearchToken {
  kind: string;
  parsedValue: string;
}

export interface TokenSearchState {
  query: string;
  tokens: TokenSearchResolvedToken[];
}

export interface TokenSearchSuggestion {
  value: string;
  label: string;
}

export interface TokenSearchModel<Result = unknown> {
  state: Signal<TokenSearchState>;
  /** Changes when a model action must replace DOM-owned editor text. */
  editorRevision: Signal<number>;
  suggestions: Signal<readonly TokenSearchSuggestion[]>;
  result: Signal<Result | undefined>;
  edit(value: TokenSearchFieldValue, commit?: boolean): void;
  submit(value: TokenSearchFieldValue): void;
  choose(value: string): void;
  /** Commit a value for the active `name:` prefix, even when it is not suggested. */
  commit(value: string): void;
  expandToken(value: string): void;
  remove(value: string): void;
  clear(): void;
  dismiss(): void;
}

export interface TokenSearchModelOptions<Result> {
  rules?: readonly TokenSearchRule[];
  initial?: TokenSearchFieldValue;
  /** Runs after every state change, including initial state. */
  evaluate?: (state: TokenSearchState) => Result;
  onSubmit?: (state: TokenSearchState, result: Result | undefined) => void;
}

const escapePattern = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const quote = (text: string) =>
  /[\s()"\\]/.test(text)
    ? `"${text.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
    : text;
const unquote = (text: string) =>
  text.startsWith('"') && text.endsWith('"')
    ? text.slice(1, -1).replace(/\\(["\\])/g, '$1')
    : text;

/** Opt-in state, token parsing, suggestions, and evaluation for TokenSearchField. */
export function createTokenSearchModel<Result = unknown>({
  rules = [],
  initial = { query: '', tokens: [] },
  evaluate,
  onSubmit,
}: TokenSearchModelOptions<Result> = {}): TokenSearchModel<Result> {
  const byName = new Map(rules.map((rule) => [rule.name.toLowerCase(), rule]));
  if (
    byName.size !== rules.length ||
    rules.some((rule) => !/^[\w-]+$/.test(rule.name))
  )
    throw new Error('Token search rule names must be unique words');
  const names = [...byName.keys()].map(escapePattern).join('|');
  const pattern = names
    ? new RegExp(
        `(?:^|[\\s(])((?:${names}):(?:"(?:\\\\.|[^"])*"|[^"\\s()][^\\s()]*))(?=$|[\\s)])`,
        'gi',
      )
    : undefined;
  const activePattern = names
    ? new RegExp(
        `(?:^|[\\s(])((?:${names}):(?:"(?:\\\\.|[^"])*|[^\\s()]*))$`,
        'i',
      )
    : undefined;

  const resolve = (
    raw: string,
    offset: number,
  ): TokenSearchResolvedToken | undefined => {
    const separator = raw.indexOf(':');
    const kind = raw.slice(0, separator).toLowerCase();
    const rule = byName.get(kind);
    if (!rule || separator < 0) return;
    const input = unquote(raw.slice(separator + 1));
    if (!input) return;
    const parsedValue = rule.parse ? rule.parse(input) : input;
    if (parsedValue === undefined) return;
    return {
      kind,
      parsedValue,
      value: `${kind}:${quote(input)}`,
      label: rule.label?.(parsedValue, input) ?? `${kind}:${input}`,
      offset,
    };
  };

  const rehydrate = (
    token: TokenSearchToken,
  ): TokenSearchResolvedToken | undefined => {
    const resolved = resolve(token.value, token.offset ?? 0);
    return resolved ? { ...resolved, ...token } : undefined;
  };

  const state = signal<TokenSearchState>({
    query: initial.query,
    tokens: initial.tokens.flatMap((token) => {
      const resolved = rehydrate(token);
      return resolved ? [resolved] : [];
    }),
  });
  const editorRevision = signal(0);
  const suggestions = signal<readonly TokenSearchSuggestion[]>([]);
  const result = signal<Result | undefined>(evaluate?.(state.value));
  let activeStart: number | undefined;
  let activeRule: TokenSearchRule | undefined;

  const refreshSuggestions = () => {
    const match = activePattern?.exec(state.value.query);
    const raw = match?.[1];
    const separator = raw?.indexOf(':') ?? -1;
    const rule =
      separator < 0
        ? undefined
        : byName.get(raw!.slice(0, separator).toLowerCase());
    activeRule = rule;
    const input = separator < 0 ? '' : unquote(raw!.slice(separator + 1));
    activeStart =
      match && raw ? match.index + match[0].lastIndexOf(raw) : undefined;
    suggestions.value = (rule?.suggest?.(input, state.value) ?? []).flatMap(
      (candidate) => {
        const value =
          typeof candidate === 'string' ? candidate : candidate.value;
        const token = resolve(`${rule!.name}:${quote(value)}`, 0);
        return token
          ? [
              {
                value: token.value,
                label:
                  typeof candidate === 'string' ? token.label : candidate.label,
              },
            ]
          : [];
      },
    );
  };
  const publish = (next: TokenSearchState) => {
    state.value = next;
    result.value = evaluate?.(next);
    refreshSuggestions();
  };
  refreshSuggestions();

  const edit = (value: TokenSearchFieldValue, commit = false) => {
    let query = '';
    let cursor = 0;
    const added: TokenSearchResolvedToken[] = [];
    const removed: Array<{ start: number; end: number }> = [];
    for (const match of value.query.matchAll(pattern ?? /(?!) /g)) {
      const raw = match[1];
      const start = match.index + match[0].lastIndexOf(raw);
      const end = start + raw.length;
      if (end === value.query.length && !commit && !/\s$/.test(value.query))
        continue;
      const token = resolve(raw, query.length + start - cursor);
      if (!token) continue;
      query += value.query.slice(cursor, start);
      token.offset = query.length;
      added.push(token);
      removed.push({ start, end });
      cursor = end;
    }
    const suffix = value.query.slice(cursor);
    query += added.length && /^\s+$/.test(suffix) ? '' : suffix;
    const existing = value.tokens.flatMap((token) => {
      const resolved = rehydrate(token);
      if (!resolved) return [];
      const offset = token.offset ?? value.query.length;
      return [
        {
          ...resolved,
          offset:
            offset -
            removed.reduce(
              (total, range) =>
                total + Math.max(0, Math.min(offset, range.end) - range.start),
              0,
            ),
        },
      ];
    });
    const tokens = [...existing, ...added].sort(
      (left, right) => (left.offset ?? 0) - (right.offset ?? 0),
    );
    publish({ query, tokens });
  };

  const commitResolved = (token: TokenSearchResolvedToken | undefined) => {
    if (!token || activeStart === undefined) return;
    const query = state.value.query.slice(0, activeStart);
    publish({ query, tokens: [...state.value.tokens, token] });
  };
  const choose = (value: string) => {
    if (
      activeStart === undefined ||
      !suggestions.value.some((suggestion) => suggestion.value === value)
    )
      return;
    commitResolved(resolve(value, activeStart));
  };
  const commit = (value: string) => {
    if (!activeRule || activeStart === undefined) return;
    commitResolved(resolve(`${activeRule.name}:${quote(value)}`, activeStart));
  };

  return {
    state,
    editorRevision,
    suggestions,
    result,
    edit,
    submit(value) {
      edit(value, true);
      onSubmit?.(state.value, result.value);
    },
    choose,
    commit,
    expandToken(value) {
      const index = state.value.tokens.findIndex(
        (token) => token.value === value,
      );
      if (index < 0) return;
      const offset = Math.max(
        0,
        Math.min(
          state.value.query.length,
          state.value.tokens[index].offset ?? state.value.query.length,
        ),
      );
      const insertion = `${value} `;
      publish({
        query: `${state.value.query.slice(0, offset)}${insertion}${state.value.query.slice(offset)}`,
        tokens: state.value.tokens.flatMap((token, at) =>
          at === index
            ? []
            : [
                {
                  ...token,
                  offset:
                    (token.offset ?? 0) + (at > index ? insertion.length : 0),
                },
              ],
        ),
      });
    },
    remove(value) {
      const index = state.value.tokens.findIndex(
        (token) => token.value === value,
      );
      if (index < 0) return;
      publish({
        ...state.value,
        tokens: state.value.tokens.filter((_, at) => at !== index),
      });
    },
    clear() {
      publish({ query: '', tokens: [] });
      editorRevision.value++;
    },
    dismiss() {
      suggestions.value = [];
    },
  };
}
