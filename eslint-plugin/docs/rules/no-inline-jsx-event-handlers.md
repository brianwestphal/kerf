# `kerfjs/no-inline-jsx-event-handlers`

Disallow inline `onClick`-style JSX event handler attributes on intrinsic (lowercase-tag) elements.

Maps to **kerf Hard Rule 9** — kerf's JSX runtime renders to HTML strings, so an inline `onClick={fn}` has no way to attach the handler to the resulting node. Use a `data-action` attribute and `delegate()` from the mount root instead.

## ❌ Incorrect

```tsx
<button onClick={save}>Save</button>
<input onChange={update} />
<form onSubmit={submit}>…</form>
```

## ✅ Correct

```tsx
// In the template:
<button data-action="save">Save</button>
<input data-action="update" />
<form data-action="submit">…</form>

// Once, at module init:
delegate(rootEl, 'click', '[data-action="save"]', save);
delegate(rootEl, 'input', '[data-action="update"]', update);
delegate(rootEl, 'submit', '[data-action="submit"]', submit);
```

## Why this rule is AST-only

The check is a pure syntactic scan: attribute name starts with `on` followed by an uppercase letter, on a JSX element whose tag begins with a lowercase letter. No type information needed.

## What this rule does NOT catch

- Handler-shaped props on custom components (`<MyButton onClick={fn} />`) — these are valid JSX prop names; kerf's runtime calls `MyButton({ onClick })`. Whether the component does the right thing with it is its own responsibility.
- Lowercase HTML attributes that begin with `on` (e.g. `onload` as a literal string attribute on `<body onload="…">`) — these are HTML-string attributes, not handlers, and kerf passes them through verbatim.
