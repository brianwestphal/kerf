# `kerfjs/no-raw-with-dynamic-arg`

Warn when `raw()` is called with a dynamic argument (any expression that is not a static string literal or an expression-free template literal).

`raw(html)` bypasses kerf's HTML escaping and marks a string as trusted for direct DOM injection. Passing dynamic or user-controlled content is an XSS vulnerability. This rule forces an explicit `// eslint-disable-next-line` acknowledgment at every dynamic injection point, creating a searchable audit trail.

**Severity in `kerfjs.configs.recommended`: `warn`** (not `error`) because sanitized pipelines like `raw(DOMPurify.sanitize(marked(input)))` look dynamic to an AST rule but are legitimate. The warn prompts review; `eslint-disable` makes the intent explicit.

## ❌ Incorrect

```ts
raw(userInput)                     // variable reference
raw(fetchedHtml())                 // function call
raw(`<b>${title}</b>`)             // template literal with expressions
raw(isAdmin ? adminHtml : guestHtml)  // conditional expression
```

## ✅ Correct

```ts
raw('<p>Static markup</p>')        // string literal — no warning
raw(`<p>Static template</p>`)      // expression-free template literal — no warning

// Dynamic but audited — suppress with eslint-disable
// eslint-disable-next-line kerfjs/no-raw-with-dynamic-arg
raw(DOMPurify.sanitize(marked(userMarkdown)))
```

## Why `warn` and not `error`

Sanitization pipelines (`DOMPurify`, `sanitize-html`, server-rendered trusted content) are legitimate uses of `raw()` with a dynamic argument. An `error` severity would block every such callsite. `warn` surfaces the pattern for review; the `eslint-disable` suppression becomes the permanent audit marker.

## What this rule catches

- Bare `raw(expr)` calls
- Member-expression calls `kerf.raw(expr)` and `kerfjs.raw(expr)`

## The sanctioned escape hatch: an explicit `eslint-disable`

There is one sanctioned way to inject a genuinely-trusted dynamic value — a CSRF token, a trusted `<script src>`, a server-issued id, a sanitized Markdown render: call `raw()` and acknowledge it with an inline `// eslint-disable-next-line kerfjs/no-raw-with-dynamic-arg` on that call. The disable comment is the audit marker — it says "a human reviewed this and it's trusted," and it's greppable across the codebase. There is deliberately no separate lint-exempt function; a second name that silently bypasses this rule would remove exactly the audit trail the rule exists to create.

## A lot of `raw()` is a smell

If a codebase reaches for `raw()` often, that's usually a sign the wrong tool is being used. kerf escapes automatically everywhere else, and the common cases have a safer, first-class answer:

- **Interpolating dynamic text or attributes?** Plain JSX escapes it (`<p>{value}</p>`, `class={sig}`) — no `raw()` needed.
- **Composing markup?** Build a `SafeHtml` the normal way — a JSX expression, the `html` tagged template (`kerfjs/html`), `each()`, or a component function returning JSX. All produce trusted `SafeHtml` without hand-writing an HTML string.

Prefer steering those call sites toward `SafeHtml`/JSX rather than suppressing the warning. Reserve `raw()` (with its `eslint-disable`) for the genuinely-trusted dynamic value that has no first-class form.

## What this rule does NOT catch

- `raw()` calls where the binding was renamed via a local alias (`const inject = raw; inject(expr)`)
- The correctness of any sanitizer passed to `raw()` — that remains the caller's responsibility
