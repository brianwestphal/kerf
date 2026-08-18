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

## The blessed escape hatch: `trustedRaw()`

When a dynamic value is genuinely server-trusted — a CSRF token, a trusted `<script src>`, a server-issued id — use `trustedRaw()` (exported from `kerfjs`) instead of `raw()`. It is identical at runtime but is **not** named `raw`, so this rule leaves it alone. That replaces scattered `eslint-disable` comments with one intention-revealing call. `trustedRaw()` is not a sanitizer — only pass values you control, never raw user input.

## What this rule does NOT catch

- `raw()` calls where the binding was renamed via a local alias (`const inject = raw; inject(expr)`)
- The correctness of any sanitizer passed to `raw()` — that remains the caller's responsibility
