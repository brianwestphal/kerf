# `kerfjs/prefer-attr-selector`

Prefer `attr('name', 'value').selector` over a literal `[name="value"]` selector when calling `delegate()` or `delegateCapture()`.

`attr()` (added in kerf 0.11) defines an action key once and exposes both `.attrs` (spread into JSX) and `.selector` (passed to `delegate()`). Routing JSX and the delegate target through one typed constant means renames stay in sync — change the value in one place and both the JSX attribute and the selector update together.

## ❌ Discouraged

```tsx
<button data-action="toggle">Toggle</button>
delegate(root, 'click', '[data-action="toggle"]', handler);
```

The JSX attribute and the selector string are two independent literals; renaming the action key in JSX leaves the delegate selector unchanged, and the handler silently stops firing.

## ✅ Recommended

```tsx
import { attr, delegate, type AttrSpec } from 'kerfjs';

const ACTIONS = {
  toggle: attr('data-action', 'toggle'),
} as const satisfies Record<string, AttrSpec<'data-action'>>;

<button {...ACTIONS.toggle.attrs}>Toggle</button>
delegate(root, 'click', ACTIONS.toggle.selector, handler);
```

Rename `'toggle'` to `'on'` in the `ACTIONS` map and both the rendered attribute and the delegate selector update — no string-grep migration required.

## What this rule flags

A `CallExpression` whose callee is `delegate` or `delegateCapture` (by name) and whose 3rd argument is a **simple** attribute-equals string literal: `[name="value"]` or `[name='value']`, with no compound selectors, tag prefixes, or pseudo-classes.

## What this rule does NOT flag

These are intentionally left alone because `attr()` isn't a 1:1 swap for them:

- Class / id selectors: `'.toggle'`, `'#submit'`.
- Bare presence selectors: `'[data-new]'`, `'[data-edit]'` (no value to bind).
- Tag-qualified attribute selectors: `'button[data-action="x"]'`.
- Compound attribute selectors: `'[data-action="x"][data-id="y"]'` — for these, concatenate two `.selector` strings (`A.selector + B.selector`) or use `attr()` only for one of the legs.
- Selectors held in variables (not string literals) — already abstracted.

## Severity

Reported as `warn` in the recommended config. The literal-selector form still works at runtime, and a one-off selector that's never shared with JSX is a legitimate use case — this rule is a nudge toward the rename-safe pattern, not a correctness bug.
