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

Preferred — use `attr()` so the attribute name lives in one typed constant and
renames propagate to both JSX and `delegate()` automatically:

```tsx
import { attr, delegate, type AttrSpec } from 'kerfjs';

const ACTIONS = {
  save:   attr('data-action', 'save'),
  update: attr('data-action', 'update'),
  submit: attr('data-action', 'submit'),
} as const satisfies Record<string, AttrSpec<'data-action'>>;

// In the template — spread .attrs (no hardcoded 'data-action' at each call site):
<button {...ACTIONS.save.attrs}>Save</button>
<input {...ACTIONS.update.attrs} />
<form {...ACTIONS.submit.attrs}>…</form>

// Once, at module init — use .selector:
delegate(rootEl, 'click',  ACTIONS.save.selector,   save);
delegate(rootEl, 'input',  ACTIONS.update.selector,  update);
delegate(rootEl, 'submit', ACTIONS.submit.selector,  submit);
```

String literals still work for ad-hoc fixed selectors:

```tsx
<button data-action="save">Save</button>
delegate(rootEl, 'click', '[data-action="save"]', save);
```

## Why this rule is AST-only

The check is a pure syntactic scan: attribute name starts with `on` followed by an uppercase letter, on a JSX element whose tag begins with a lowercase letter. No type information needed.

## What this rule does NOT catch

- Handler-shaped props on custom components (`<MyButton onClick={fn} />`) — these are valid JSX prop names; kerf's runtime calls `MyButton({ onClick })`. Whether the component does the right thing with it is its own responsibility.
- Lowercase HTML attributes that begin with `on` (e.g. `onload` as a literal string attribute on `<body onload="…">`) — these are HTML-string attributes, not handlers, and kerf passes them through verbatim.
