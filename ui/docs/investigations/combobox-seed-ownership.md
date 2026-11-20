# Combobox input ownership

A field can take initial text and then let the person edit it. In Kerf, a
component function returns HTML and has no persistent instance. For an
uncontrolled Combobox, obtain the seed outside the repeating render and pass
that stable string as `value`. Changing suggestions can then rerender the
field without moving the caret or replacing an edit.

## What the browser does today

The Chromium case in `ui/tests/browser/combobox-seed.spec.ts` uses the
published entry points inside a mounted form with the normal keyboard wiring.
The native input's `defaultValue` and its `value` attribute agree throughout.

| Action                                                | Visible text    | Native reset value |
| ----------------------------------------------------- | --------------- | ------------------ |
| Mount with `value="first"`                            | first           | first              |
| Type "draft", set the caret at 2, refresh suggestions | draft (caret 2) | first              |
| Render `value="second"` while focused                 | draft           | second             |
| Blur, render `value="third"`                          | third           | third              |
| Type again, reset the form                            | third           | third              |
| Type again, replace the form with a new key           | third           | third              |

## Proposed contract for review

Capture `initialValue` outside the repeating render, on the same per-field
owner that registers the commit callback in the scoped Combobox pilot.
One live owner holds a scalar seed and can render updated suggestions,
disabled status, and hint. A new field identity takes a fresh seed. Native
form reset restores the seed captured for the current field. Resolve
`initialValue ?? value ?? ''` at creation if both spellings are accepted,
so an explicit empty string wins. Render the seed through the existing escaped
input attribute for server and client. Capture it in the field owner, never
in a process-wide map keyed on a DOM id. A browser can host multiple
independent roots and a server can render multiple requests at once.

A direct `initialValue` alias on today's function would still set the new
value attribute on each coarse render. A blurred field would lose its edit.
The JSX `defaultValue` spelling aliases to that same attribute. An observer
can run after the morph has overwritten the property. Skipping the whole
input during morph would also freeze disabled status, placeholder and accessible
relationships. A general initial-only attribute in the core renderer deserves
its own evaluation across full and granular reconciliation and the supported
runtime versions.

For an owner-based API, verify changing suggestions and unrelated parent
props before and after blur, accessible label/hint changes, reset, remount,
a second independent root, and escaped initial text in SSR. Compare that
authoring cost with keeping a stable `value` in the existing API.
