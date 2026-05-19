# `kerfjs/no-nested-mount`

Disallow `mount()` calls nested inside another `mount()`'s render callback.

Maps to **kerf Hard Rule 5** — there is one `mount()` per render root. Composition is via plain functions that return JSX, not via nesting another mount tree inside an outer one.

## ❌ Incorrect

```tsx
mount(root, () => {
  mount(otherRoot, () => <div>nested</div>); // ← reported
  return <div>outer</div>;
});

mount(root, () => mount(otherRoot, () => <div />)); // ← reported
```

## ✅ Correct

```tsx
// Two sibling roots, mounted at module init:
mount(headerRoot, () => <Header />);
mount(bodyRoot, () => <Body />);

// Composition via plain functions:
const Header = () => <h1>{title.value}</h1>;
const Body = () => <main><Header /><div>{count.value}</div></main>;
mount(root, () => <Body />);
```

## What this rule does NOT catch

- `mount()` called from a helper invoked from within a render: the rule only walks lexical ancestors, so `mount(root, () => { helperThatCallsMount(); })` is not flagged.
- `mount()` qualified by a namespace (`MyLib.mount(…)`) — only the bare `mount` identifier is checked.
