# 19. Native top-layer backing for `kerfjs/overlay`

> **Status: shipped.** An **opt-in** `native: true` option on every `kerfjs/overlay`
> surface hosts the overlay in the browser **top layer** — a `<dialog>` opened
> with `.showModal()` for modal surfaces, the **Popover API** for non-modal ones —
> feature-detected, falling back to today's plain `<div>` where unsupported. The
> `render` slot and the promise API are unchanged.

## 19.1 Why — three correctness gaps in a pure-JS overlay

kerf's overlay is structural-only and, by default, hand-rolls everything a modal
needs from a plain `<div>` appended to `document.body`. That is correct for the
common case but has three gaps a JS overlay cannot fully close:

1. **Stacking.** The `<div>` sets **no `z-index`** — it wins only by being last in
   DOM order. Any page element with `position: fixed/absolute; z-index: N` (a
   sticky header, a toast from another library) can paint *over* it. The browser
   **top layer** (`dialog.showModal()`, `[popover]`) always renders above the
   entire page regardless of `z-index`.
2. **Real modality / inerting.** kerf's focus trap only intercepts `Tab`.
   `dialog.showModal()` makes the rest of the document **`inert`** — pointer,
   focus, *and* assistive-technology virtual-cursor navigation are all blocked. A
   JS focus trap leaves the background reachable by AT and by pointer.
3. **Light-dismiss for popovers.** The Popover API brings native light-dismiss and
   the `:popover-open` state for `popover()` / `tooltip()`.

`native: true` opts into the platform primitives that close these gaps, while
keeping kerf's exact promise API and `render` slots.

## 19.2 Why opt-in, not the default

kerf is **structural-only and ships zero CSS.** Native `<dialog>` and `[popover]`
carry **UA default styles** — a `::backdrop`, centering, a border, padding,
`margin: auto`. Switching the *default* backing would silently inject those styles
into every consumer's dialog, a behavior change for a no-CSS library; and a
"structural reset" of those styles would itself be shipping CSS. So native backing
is **opt-in** — a consumer asks for it per call (or wraps their own default) and
takes on the UA styling with eyes open. The default stays the plain `<div>`,
byte-for-byte today's behavior. (Default-on can be revisited later if a
"reset UA styles" story is agreed.)

## 19.3 The API — a single `native: boolean`, feature-detected

`native?: boolean` (default `false`) is accepted by `overlay` and threaded through
`confirm` / `prompt` / `form` / `choice` / `popover` / `tooltip`. **Modality
already determines which primitive applies** — the caller never picks
dialog-vs-popover; the function they called does:

<div class="kerf-compare">

| Surface | Modality | Native backing |
| --- | --- | --- |
| `overlay({ trap: true })`, `confirm`, `prompt`, `form`, `choice` | modal | `<dialog>` + `.showModal()` |
| `overlay({ trap: false })`, `popover`, `tooltip` | non-modal | `[popover]` + `.showPopover()` |

</div>

Each primitive is **independently feature-detected** (an engine can ship one
without the other):

- modal: `typeof HTMLDialogElement.prototype.showModal === 'function'`
- non-modal: `typeof HTMLElement.prototype.showPopover === 'function'`

Where the API is missing, kerf **falls back to the plain `<div>`** with today's
wiring — so `native: true` is always safe to pass; it is a progressive
enhancement, never a hard requirement.

```ts
// Modal, in a real <dialog> where supported (else a <div>):
const ok = await confirm('Delete this file?', { native: true, danger: true });

// Non-modal, in the top layer via the Popover API where supported:
const menu = popover(triggerEl, <Menu />, { native: true });
```

## 19.4 What changes internally (and what doesn't)

- **Modal (`<dialog>`).** kerf creates a `<dialog>` instead of a `<div>`, appends
  it, mounts the content, then calls `showModal()`. The browser inerts the rest of
  the document and confines `Tab` focus itself, so kerf does **not** install its
  keyboard trap; Escape arrives as the dialog's **`cancel` event**, which kerf
  takes over (`preventDefault` so it owns teardown, then dismisses only if
  `escape` is a dismiss trigger). Backdrop dismissal is unchanged — a click whose
  target is the dialog element (the `::backdrop`) dismisses. `close()` calls the
  dialog's native `.close()` before removing the node. The ARIA `role="dialog"` /
  `aria-modal="true"` fallback attributes are **omitted** in native mode (the
  `<dialog>` conveys modality itself).
- **Non-modal (`[popover]`).** kerf sets `popover="manual"` on the wrapper and
  calls `showPopover()`; it keeps owning its **own** dismiss wiring (outside-click,
  `outsideIgnore`, etc.) rather than the API's auto light-dismiss, so dismissal
  behavior is identical to the `<div>` path — the win is purely top-layer
  stacking. kerf neutralizes the UA `[popover] { inset: 0; margin: auto }`
  anchoring (`style.inset = 'auto'`) so `positionAnchored` keeps controlling
  placement. `close()` calls `hidePopover()` before removing the node.
- **Unchanged everywhere:** the promise API (`{ el, close, result }`), the `render`
  slots, `validate`, Enter-to-submit, `initialFocus`, `outsideIgnore`, and
  focus-restore. kerf's manual focus-restore stays in place — redundant with
  `<dialog>`'s automatic restore, but harmless, and it is the fallback path's
  behavior.

## 19.5 Caveats to document (they are the tradeoff of native mode)

- **UA default styles apply, and kerf does not reset them.** In native mode the
  overlay is a real `<dialog>` / `[popover]`, so the UA `::backdrop`, centering,
  border, padding, and `margin` apply. Style them yourself — see the stable
  styling contract in §19.6. This is the price of the top layer; kerf shipping a
  reset would violate its zero-CSS contract.
- **`container` is effectively a visual no-op.** The top layer ignores where the
  element lives in the DOM, so `container` no longer controls where the overlay
  *appears* (it still governs which document the element is created in, which
  matters for nested-document / Tauri cases). No dev warning is emitted — it is
  documented behavior.
- **Focus-restore is doubly handled.** `<dialog>` restores focus on close and kerf
  also restores it; the result is the same, and there is no conflict.

## 19.6 The stable styling contract

Because kerf ships no CSS, native mode's usefulness depends on a **clear, stable**
way for the app to style the UA element. That contract is:

- **The `className` lands on the native element itself** — the `<dialog>` or the
  `[popover]` `<div>` — exactly as it does on the `<div>` today. Style the element
  through it.
- **The backdrop is styled via the `::backdrop` pseudo-element** of that same
  class: `.kerf-overlay::backdrop { … }` (or your custom `className`). This is the
  only way to style a top-layer backdrop, and it is stable across engines.

```css
/* Reset the UA dialog chrome and style the backdrop — the app owns this. */
dialog.kerf-overlay {
  border: 0;
  padding: 0;
  /* your own sizing / centering */
}
dialog.kerf-overlay::backdrop {
  background: rgb(0 0 0 / 0.4);
}
```

The `className` → element + `className::backdrop` → backdrop mapping is the
supported, stable surface; it will not change without a major version.

## 19.7 Testing

happy-dom implements `<dialog>` (`showModal` / `close` / `.open` / the `cancel`
event) but **not** the Popover API, and neither engine models the real top layer /
`inert` / `::backdrop`. So:

- **Unit tests** (`tests/unit/overlay.test.ts` › "native top-layer backing") assert
  the **wiring**, which is engine-independent: the element type (`<dialog>` vs a
  `[popover]` `<div>`), that it opens (`.open` / `showPopover` called), promise
  resolution through the native element, the `cancel`-event Escape path (dismiss
  when a trigger, swallow when not), backdrop dismissal, `close()` exiting the top
  layer, and the **fallback to `<div>`** when the API is absent. The popover path
  is exercised by stubbing `showPopover` / `hidePopover` (happy-dom lacks them).
- **Browser tests** (`tests/browser/overlay.spec.ts`, Playwright) assert the real
  platform behavior: a `native` `confirm` is a `<dialog>` with `open` set that
  resolves on click and disappears on close, and a `native` `popover` is
  `:popover-open` in the top layer.

## 19.8 Scope and follow-ups

This ticket shipped **both** halves — the modal `<dialog>` backing and the
non-modal Popover backing — behind the one `native` flag. Deliberately deferred as
possible future work (each its own ticket if pursued):

- **Native light-dismiss for popovers** (`popover="auto"`) instead of kerf's
  outside-click wiring — would change dismissal semantics, so it is opt-in future
  work, not part of this behavior-preserving pass.
- **Default-on**, if and when a "reset UA styles" story is agreed that keeps the
  zero-CSS contract.
