# `kerfjs/require-data-key-in-each`

Require `data-key` (or `id`) on the root element returned by an `each()` row render.

Maps to **kerf Hard Rule 2** — the keyed reconciler matches items by `id` first, then `data-key`. Without a key, the diff matches by position, which loses identity, focus, and cursor position on insert/delete/move.

## ❌ Incorrect

```tsx
each(items, (item) => <li>{item.name}</li>);

each(items, (item) => {
  return <li class="row">{item.name}</li>;
});

each(items, (item) => <>{item.name}</>);

// A dynamic object does not prove that a component receives a row key.
each(items, (item) => <ListActionRow rootAttributes={item.attrs} />);
```

## ✅ Correct

```tsx
each(items, (item) => <li data-key={item.id}>{item.name}</li>);

each(items, (item) => <li id={item.id}>{item.name}</li>);

// Component roots can pass a statically named key through rootAttributes.
each(items, (item) => (
  <ListActionRow rootAttributes={{ "data-key": item.id }} />
));

// Spread attributes are conservatively allowed — they may include the key.
each(items, (item) => <li {...item.attrs}>{item.name}</li>);
```

## What this rule does NOT catch

- Non-inline callbacks: `each(items, renderRow)` — the rule only inspects arrow / function-expression callbacks passed directly to `each()`.
- `each` calls qualified by a namespace: `MyLib.each(items, …)` — the rule only fires on a bare `each` identifier.
- Computed key keys behind a runtime branch: if the JSX root only sometimes carries a `data-key`, the rule reports the missing static attribute. Fix by always setting it.
- A component's dynamic `rootAttributes` object or unknown computed property name is not treated as proof of a key. Use an object literal with a `"data-key"` or `id` property where the component forwards it to its single root. A later object spread or computed property may overwrite an earlier key, so put the key last.
- The `rootAttributes` exception applies to component JSX roots, not native elements or fragment roots. The rule cannot verify a component's implementation; confirm that it forwards the key to the rendered root.
