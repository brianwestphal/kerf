import {
  readSearchField,
  SearchField,
  type SearchFieldToken,
} from '@kerfjs/ui/search-field';
import { wireSearchFields } from '@kerfjs/ui/wire-search-fields';
import { batch, mount, signal } from 'kerfjs';

// The "commit typed grammar to a chip" pattern: onEdit turns each
// whitespace-terminated `key:value` into a token and keeps the rest as query.
const query = signal('');
const tokens = signal<SearchFieldToken[]>([]);
const root = document.querySelector<HTMLElement>('[data-app]')!;

mount(root, () => (
  <SearchField
    id="commit-search"
    label="Search"
    query={query.value}
    tokens={tokens.value}
    placeholder="Search"
  />
));

wireSearchFields(root, {
  collapsible: false,
  onEdit: ({ editor }) => {
    const value = readSearchField(editor, tokens.value);
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
