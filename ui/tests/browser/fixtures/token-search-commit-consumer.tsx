import {
  readTokenSearchField,
  TokenSearchField,
  type TokenSearchToken,
} from '@kerfjs/ui/token-search-field';
import { wireTokenSearchFields } from '@kerfjs/ui/wire-token-search-fields';
import { batch, mount, signal } from 'kerfjs';

// The "commit typed grammar to a chip" pattern: onEdit turns each
// whitespace-terminated `key:value` into a token and keeps the rest as query.
const query = signal('');
const tokens = signal<TokenSearchToken[]>([]);
const root = document.querySelector<HTMLElement>('[data-app]')!;

mount(root, () => (
  <TokenSearchField
    id="commit-search"
    label="Search"
    query={query.value}
    tokens={tokens.value}
    placeholder="Search"
  />
));

wireTokenSearchFields(root, {
  collapsible: false,
  onEdit: ({ editor }) => {
    const value = readTokenSearchField(editor, tokens.value);
    const committed = [...value.tokens];
    let rest = value.query;
    for (
      let match = /^(\S+:\S+)\s+/.exec(rest);
      match;
      match = /^(\S+:\S+)\s+/.exec(rest)
    ) {
      committed.push({ value: match[1]!, label: match[1]! });
      rest = rest.slice(match[0].length);
    }
    batch(() => {
      tokens.value = committed;
      query.value = rest;
    });
  },
  keyboard: {
    onRemoveToken: ({ value }) => {
      tokens.value = tokens.value.filter((token) => token.value !== value);
    },
  },
});

Object.assign(globalThis, {
  commitState: () => ({
    tokens: tokens.value.map((token) => token.value),
    query: query.value,
  }),
});
