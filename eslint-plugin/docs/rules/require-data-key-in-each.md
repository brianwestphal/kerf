# `kerfjs/require-data-key-in-each`

Require `data-key` (or `id`) on the root element returned by an `each()` row render.

Maps to **kerf Hard Rule 2** — the keyed reconciler matches items by `id` first, then `data-key`. Without a key, the diff matches by position, which loses identity, focus, and cursor position on insert/delete/move.

## ❌ Incorrect

```tsx
each(items, (item) => <li>{item.name}</li>)

each(items, (item) => {
  return <li class="row">{item.name}</li>;
})

each(items, (item) => <>{item.name}</>)
```

## ✅ Correct

```tsx
each(items, (item) => <li data-key={item.id}>{item.name}</li>)

each(items, (item) => <li id={item.id}>{item.name}</li>)

// Spread attributes are conservatively allowed — they may include the key.
each(items, (item) => <li {...item.attrs}>{item.name}</li>)
```

## What this rule does NOT catch

- Non-inline callbacks: `each(items, renderRow)` — the rule only inspects arrow / function-expression callbacks passed directly to `each()`.
- `each` calls qualified by a namespace: `MyLib.each(items, …)` — the rule only fires on a bare `each` identifier.
- Computed key keys behind a runtime branch: if the JSX root only sometimes carries a `data-key`, the rule reports the missing static attribute. Fix by always setting it.
